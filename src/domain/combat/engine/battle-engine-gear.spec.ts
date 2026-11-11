import { Stat } from '@/domain/characters/enums/stat'
import { computeStats } from '@/domain/characters/services/stat-calculator'
import { GearPassive } from '@/domain/gear/value-objects/gear-passive'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { StatusType } from '@/domain/skills/enums/status-type'
import { makeBattleSnapshot } from 'test/factories/make-battle-snapshot'
import { FixedRng } from 'test/fakes/fixed-rng'
import { describe, expect, it } from 'vitest'
import { BattleSide } from '../enums/battle-enums'
import { BattleSnapshot, SnapshotGear } from '../value-objects/battle-snapshot'
import { BattleEngine } from './battle-engine'

const P0 = 'PLAYER:0'
const O0 = 'OPPONENT:0'

/** Avança Defendendo com todos até a vez de `ref`. */
function untilTurnOf(engine: BattleEngine, ref: string) {
  let turn = engine.nextTurn()!
  while (turn.ref !== ref) {
    engine.act({ type: 'DEFEND', timeout: true })
    turn = engine.nextTurn()!
  }
}

/** Equipamento só com o que o teste quer ver (sem bônus, sem custo, sem penalidade). */
function gear(override: Partial<SnapshotGear> = {}): SnapshotGear {
  return {
    key: 'teste',
    name: 'Equipamento de teste',
    kind: 'WEAPON',
    grade: 'KING',
    lineage: 'MATERIAL',
    bond: 'FULL',
    bonusPercents: {},
    penaltyPercents: {},
    initialDesgastePercent: 0,
    passive: { type: 'SINGLE_TARGET_REDUCTION', percent: 0 },
    loseAction: null,
    ...override,
  }
}

/** Todos no nível 50, de longe; PLAYER:0 com o equipamento (e OPPONENT:0, se pedido). */
function snapshotWith(
  playerGear?: SnapshotGear,
  opponentGear?: SnapshotGear
): BattleSnapshot {
  const snapshot = makeBattleSnapshot()
  for (const unit of [...snapshot.player.units, ...snapshot.opponent.units]) {
    unit.level = 50
    unit.skills = unit.skills.map((s) => ({ ...s, range: SkillRange.RANGED }))
  }
  if (playerGear) snapshot.player.units[0].gear = playerGear
  if (opponentGear) snapshot.opponent.units[0].gear = opponentGear
  return snapshot
}

const hit = (from: string, side: BattleSide) => ({
  type: 'SKILL' as const,
  skillKey: `${from}-skill-0`,
  targetSide: side,
  target: { row: 0, column: 0 },
})

function damagePreview(engine: BattleEngine, from: string, side: BattleSide) {
  const preview = engine.previewSkill(from, hit(from, side))
  if (preview.isLeft()) throw preview.value
  const effect = preview.value.hits[0].effects[0]
  return effect.type === 'DAMAGE' ? effect.amount : NaN
}

const passive = (p: GearPassive) => gear({ passive: p })

describe('Battle Engine (equipamento vivo)', () => {
  it('should be able to add the bonus after the caps and charge the full bond cost as Desgaste', () => {
    const sut = new BattleEngine(
      snapshotWith(
        gear({
          bonusPercents: { DEFENSE: 12, HP: 8 },
          initialDesgastePercent: 5,
        })
      ),
      new FixedRng([0])
    )

    const unit = makeBattleSnapshot().player.units[0]
    const expected = computeStats({
      profile: unit.profile,
      level: 50,
      freePoints: unit.freePoints,
      gearPercents: { DEFENSE: 12, HP: 8 },
    })

    expect(sut.unit(P0).maxHp).toBe(expected.HP)
    // Material: o custo do elo pleno cai na Defesa, já no início
    expect(sut.unit(P0).stats[Stat.DEFENSE]).toBeCloseTo(
      expected.DEFENSE * 0.95
    )
  })

  it('should be able to lower the stats with the partial and no bond penalties', () => {
    const sut = new BattleEngine(
      snapshotWith(gear({ bond: 'NONE', penaltyPercents: { SPEED: -9 } })),
      new FixedRng([0.99])
    )
    const other = new BattleEngine(snapshotWith(), new FixedRng([0.99]))

    expect(sut.unit(P0).stats[Stat.SPEED]).toBeLessThan(
      other.unit(P0).stats[Stat.SPEED]
    )
  })

  it('should be able to lose the action when the gear acts on its own', () => {
    const sut = new BattleEngine(
      snapshotWith(
        gear({ bond: 'NONE', loseAction: { start: 6, step: 5, max: 45 } })
      ),
      new FixedRng([0])
    )

    for (let i = 0; i < 8; i++) {
      if (!sut.nextTurn()) break
      sut.act({ type: 'DEFEND', timeout: true })
    }

    expect(
      sut.events.some(
        (e) => e.type === 'SKIP' && e.ref === P0 && e.reason === 'GEAR'
      )
    ).toBe(true)
  })

  it('should be able to start with a shield (Fundamental)', () => {
    const sut = new BattleEngine(
      snapshotWith(passive({ type: 'INITIAL_SHIELD', percentOfMaxHp: 5 })),
      new FixedRng([0])
    )

    expect(sut.unit(P0).shield).toBe(Math.round(sut.unit(P0).maxHp * 0.05))
  })

  it('should be able to take less damage from single-target hits (Material)', () => {
    const plain = new BattleEngine(snapshotWith(), new FixedRng([0]))
    const armored = new BattleEngine(
      snapshotWith(passive({ type: 'SINGLE_TARGET_REDUCTION', percent: 10 })),
      new FixedRng([0])
    )
    untilTurnOf(plain, O0)
    untilTurnOf(armored, O0)

    const base = damagePreview(plain, O0, BattleSide.PLAYER)
    const reduced = damagePreview(armored, O0, BattleSide.PLAYER)

    expect(reduced).toBeLessThan(base)
    expect(reduced).toBeCloseTo(base * 0.9, -1)
  })

  it('should be able to ignore part of the target Defense (Vetorial)', () => {
    const plain = new BattleEngine(snapshotWith(), new FixedRng([0]))
    const piercing = new BattleEngine(
      snapshotWith(passive({ type: 'IGNORE_DEFENSE', percent: 10 })),
      new FixedRng([0])
    )
    untilTurnOf(plain, P0)
    untilTurnOf(piercing, P0)

    expect(damagePreview(piercing, P0, BattleSide.OPPONENT)).toBeGreaterThan(
      damagePreview(plain, P0, BattleSide.OPPONENT)
    )
  })

  it('should be able to resist status better (Psíquica)', () => {
    const withStatus = (snapshot: BattleSnapshot) => {
      snapshot.opponent.units[0].skills[0].effects = [
        {
          type: 'APPLY_STATUS',
          status: StatusType.ROOT,
          duration: 2,
          baseChance: 0.5,
        },
      ]
      return snapshot
    }
    const chance = (engine: BattleEngine) => {
      untilTurnOf(engine, O0)
      const preview = engine.previewSkill(O0, hit(O0, BattleSide.PLAYER))
      if (preview.isLeft()) throw preview.value
      const effect = preview.value.hits[0].effects[0]
      return effect.type === 'APPLY_STATUS' ? effect.chance : NaN
    }

    const plain = chance(
      new BattleEngine(withStatus(snapshotWith()), new FixedRng([0]))
    )
    const guarded = chance(
      new BattleEngine(
        withStatus(snapshotWith(passive({ type: 'STATUS_WILL', percent: 15 }))),
        new FixedRng([0])
      )
    )

    expect(guarded).toBeLessThan(plain)
  })

  it('should be able to burn on hit (Elemental)', () => {
    const sut = new BattleEngine(
      snapshotWith(passive({ type: 'DOT_ON_HIT', chance: 0.15 })),
      new FixedRng([0])
    )
    untilTurnOf(sut, P0)

    const done = sut.act(hit(P0, BattleSide.OPPONENT))

    expect(
      done.isRight() &&
        done.value.find((e) => e.type === 'STATUS' && e.source === 'GEAR')
    ).toMatchObject({ ref: P0, targetRef: O0, status: 'DOT' })
  })

  it('should be able to regenerate at the start of the turn (Biológica)', () => {
    const sut = new BattleEngine(
      snapshotWith(passive({ type: 'REGEN', percentOfMaxHp: 2 })),
      new FixedRng([0])
    )
    untilTurnOf(sut, O0)
    sut.act(hit(O0, BattleSide.PLAYER))

    untilTurnOf(sut, P0)

    expect(
      sut.events.some(
        (e) =>
          e.type === 'HEAL' &&
          e.source === 'GEAR' &&
          e.ref === P0 &&
          e.amount > 0
      )
    ).toBe(true)
  })
})
