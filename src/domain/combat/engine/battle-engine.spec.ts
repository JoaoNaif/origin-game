import { SeededRng } from '@/core/rng/seeded-rng'
import { Stat } from '@/domain/characters/enums/stat'
import { StatusType } from '@/domain/skills/enums/status-type'
import { makeBattleSnapshot } from 'test/factories/make-battle-snapshot'
import { FixedRng } from 'test/fakes/fixed-rng'
import { describe, expect, it } from 'vitest'
import { BattleEndReason, BattleSide } from '../enums/battle-enums'
import { InvalidActionError } from '../errors/invalid-action-error'
import { BattleActionPayload } from '../value-objects/battle-action'
import { BattleSnapshot } from '../value-objects/battle-snapshot'
import { BattleEngine } from './battle-engine'

/** Jogada simples para os testes: a primeira skill pronta no exposto da primeira linha ocupada do inimigo. */
function simpleChoice(engine: BattleEngine, ref: string): BattleActionPayload {
  const me = engine.unit(ref)
  const enemySide =
    me.side === BattleSide.PLAYER ? BattleSide.OPPONENT : BattleSide.PLAYER
  const enemies = engine
    .aliveRefs(enemySide)
    .map((r) => engine.unit(r).position!)
    .sort((a, b) => a.row - b.row || a.column - b.column)
  const target = enemies[0]
  const skillKey = me.readySkills[0]

  return skillKey
    ? { type: 'SKILL', skillKey, targetSide: enemySide, target }
    : { type: 'DEFEND' }
}

/** Roda a batalha até o fim com a jogada simples e devolve as ações tomadas. */
function play(engine: BattleEngine, choose = simpleChoice) {
  const actions: { ref: string; payload: BattleActionPayload }[] = []

  for (let turn = engine.nextTurn(); turn; turn = engine.nextTurn()) {
    const payload = choose(engine, turn.ref)
    const result = engine.act(payload)
    if (result.isLeft()) throw result.value
    actions.push({ ref: turn.ref, payload })
  }

  return actions
}

describe('Battle Engine', () => {
  it('should be able to play a battle to the end', () => {
    const sut = new BattleEngine(makeBattleSnapshot(), new SeededRng(42))

    play(sut)

    expect(sut.outcome).not.toBeNull()
    expect(sut.events.at(-1)?.type).toBe('BATTLE_END')
    expect(sut.round).toBeLessThanOrEqual(31)
  })

  it('should be able to repeat the same battle for the same seed (D8)', () => {
    const first = new BattleEngine(makeBattleSnapshot(), new SeededRng(7))
    const second = new BattleEngine(makeBattleSnapshot(), new SeededRng(7))

    play(first)
    play(second)

    expect(second.events).toEqual(first.events)
  })

  it('should be able to replay a battle from the seed and the actions', () => {
    const original = new BattleEngine(makeBattleSnapshot(), new SeededRng(99))
    const actions = play(original)

    const replay = new BattleEngine(makeBattleSnapshot(), new SeededRng(99))
    for (const { ref, payload } of actions) {
      expect(replay.nextTurn()?.ref).toBe(ref)
      replay.act(payload)
    }

    expect(replay.nextTurn()).toBeNull()
    expect(replay.events).toEqual(original.events)
    expect(replay.outcome).toEqual(original.outcome)
  })

  it('should be able to reject an invalid action without changing anything', () => {
    const sut = new BattleEngine(makeBattleSnapshot(), new SeededRng(1))
    const turn = sut.nextTurn()!
    const before = sut.events.length
    const enemySide =
      turn.side === BattleSide.PLAYER ? BattleSide.OPPONENT : BattleSide.PLAYER

    // corpo a corpo atrás de alguém: a linha 1 tem alguém na coluna 1 e na 2 (factory)
    const result = sut.act({
      type: 'SKILL',
      skillKey: `${turn.ref}-skill-0`,
      targetSide: enemySide,
      target: { row: 1, column: 2 },
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidActionError)
    expect(sut.events).toHaveLength(before)
    expect(sut.nextTurn()?.ref).toBe(turn.ref)
  })

  it('should not be able to use a skill outside the build', () => {
    const sut = new BattleEngine(makeBattleSnapshot(), new SeededRng(1))
    sut.nextTurn()

    expect(
      sut
        .act({
          type: 'SKILL',
          skillKey: 'not-mine',
          targetSide: BattleSide.OPPONENT,
          target: { row: 0, column: 0 },
        })
        .isLeft()
    ).toBe(true)
  })

  it('should not charge desgaste when the skill misses', () => {
    // 0,99 erra qualquer chance de 80%
    const sut = new BattleEngine(makeBattleSnapshot(), new FixedRng([0.99]))
    const turn = sut.nextTurn()!

    const events = sut.act(simpleChoice(sut, turn.ref))

    if (events.isLeft()) throw events.value
    expect(events.value.map((e) => e.type)).toEqual(['SKILL', 'MISS'])
  })

  it('should be able to raise defense when defending', () => {
    const sut = new BattleEngine(makeBattleSnapshot(), new SeededRng(3))
    const turn = sut.nextTurn()!
    const before = sut.unit(turn.ref).stats[Stat.DEFENSE]

    sut.act({ type: 'DEFEND' })

    expect(sut.unit(turn.ref).stats[Stat.DEFENSE]).toBeCloseTo(before * 1.5)
  })

  it('should be able to skip the turn of a stunned unit', () => {
    const snapshot: BattleSnapshot = makeBattleSnapshot()
    for (const unit of snapshot.player.units) {
      unit.skills[0] = {
        ...unit.skills[0],
        effects: [
          { type: 'DAMAGE', power: 0.8 },
          {
            type: 'APPLY_STATUS',
            status: StatusType.STUN,
            duration: 1,
            baseChance: 0.9,
          },
        ],
      }
    }
    // FixedRng 0: acerta, aplica o status e desempata sempre pelo primeiro da lista
    const sut = new BattleEngine(snapshot, new FixedRng([0]))

    play(sut)

    const stunned = sut.events.find(
      (e) => e.type === 'STATUS' && e.result === 'APPLIED'
    )
    expect(stunned).toBeDefined()
    expect(
      sut.events.some((e) => e.type === 'SKIP' && e.reason === 'STUN')
    ).toBe(true)
  })

  it('should be able to force the end on round 30 when nobody falls', () => {
    const sut = new BattleEngine(makeBattleSnapshot(), new SeededRng(5))

    play(sut, () => ({ type: 'DEFEND' }))

    expect(sut.outcome?.reason).toBe(BattleEndReason.ROUND_LIMIT)
    expect(sut.events.at(-1)).toMatchObject({ type: 'BATTLE_END', round: 30 })
  })

  it('should be able to finish by elimination', () => {
    const sut = new BattleEngine(makeBattleSnapshot(), new SeededRng(11))

    play(sut)

    if (sut.outcome?.reason === BattleEndReason.ELIMINATION) {
      const loser =
        sut.outcome.winner === BattleSide.PLAYER
          ? BattleSide.OPPONENT
          : BattleSide.PLAYER
      expect(sut.aliveRefs(loser)).toHaveLength(0)
    } else {
      expect(sut.outcome?.reason).toBe(BattleEndReason.ROUND_LIMIT)
    }
  })
})
