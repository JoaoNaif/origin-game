import { BeastTemplate } from '@/domain/beasts/entities/beast-template'
import { Stat } from '@/domain/characters/enums/stat'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { makeBattleSnapshot } from 'test/factories/make-battle-snapshot'
import { FixedRng } from 'test/fakes/fixed-rng'
import { describe, expect, it } from 'vitest'
import { buildBeasts } from '../../../../prisma/seed/content/beasts'
import { BattleSide } from '../enums/battle-enums'
import { beastRef, beastUnit, summonSkill } from '../services/beast-snapshot'
import { BattleSnapshot } from '../value-objects/battle-snapshot'
import { BattleEngine } from './battle-engine'

const P0 = 'PLAYER:0'
const O0 = 'OPPONENT:0'
const BEASTS = buildBeasts()
const beast = (key: string): BeastTemplate => BEASTS.get(key)!

/** Avança Defendendo com todos até a vez de `ref`. */
function untilTurnOf(engine: BattleEngine, ref: string) {
  let turn = engine.nextTurn()!
  while (turn.ref !== ref) {
    engine.act({ type: 'DEFEND', timeout: true })
    turn = engine.nextTurn()!
  }
}

/** Todos no nível 50, de longe; os donos dados ganham a besta no slot 4. */
function snapshotWith(
  contracts: { owner: number; key: string }[]
): BattleSnapshot {
  const snapshot = makeBattleSnapshot()
  for (const unit of [...snapshot.player.units, ...snapshot.opponent.units]) {
    unit.level = 50
    unit.skills = unit.skills.map((s) => ({ ...s, range: SkillRange.RANGED }))
  }
  snapshot.player.beasts = []
  for (const { owner, key } of contracts) {
    const unit = snapshot.player.units[owner]
    const template = beast(key)
    const ref = template.takesCell ? beastRef(unit.ref, 1) : null
    unit.skills[3] = summonSkill(template, unit.ref, ref)
    if (ref) {
      snapshot.player.beasts.push(
        beastUnit(template, ref, unit, {
          HP: 1000,
          ATTACK: 100,
          DEFENSE: 100,
          SPEED: 100,
          PRECISION: 100,
          EVASION: 100,
          WILL: 100,
        })
      )
    }
  }
  return snapshot
}

const summon = (
  engine: BattleEngine,
  owner: string,
  cell = { row: 0, column: 1 }
) =>
  engine.act({
    type: 'SKILL',
    skillKey: engine.skillsOf(owner)[3].key,
    targetSide: BattleSide.PLAYER,
    target: cell,
  })

describe('Battle Engine (bestas)', () => {
  it('should be able to summon a beast into a free cell, with stats from the owner', () => {
    const sut = new BattleEngine(
      snapshotWith([{ owner: 0, key: 'lobo-de-cinzas' }]),
      new FixedRng([0])
    )
    untilTurnOf(sut, P0)

    const done = summon(sut, P0)

    expect(done.isRight()).toBe(true)
    const wolf = sut.unit('PLAYER:B0')
    expect(wolf.alive).toBe(true)
    expect(wolf.position).toEqual({ row: 0, column: 1 })
    expect(wolf.beast).toMatchObject({ contract: 'DOMINANCE', turnsLeft: 4 })
    // Cavaleiro da Dominância: 35% dos stats; Velocidade 90%
    expect(wolf.stats[Stat.ATTACK]).toBe(35)
    expect(wolf.stats[Stat.SPEED]).toBe(90)
  })

  it('should be able to charge the Dominância Will cost while the beast is on the field', () => {
    const sut = new BattleEngine(
      snapshotWith([{ owner: 0, key: 'lobo-de-cinzas' }]),
      new FixedRng([0])
    )
    untilTurnOf(sut, P0)
    const will = sut.unit(P0).stats[Stat.WILL]

    summon(sut, P0)

    expect(sut.unit(P0).stats[Stat.WILL]).toBeCloseTo(will * 0.92)
  })

  it('should be able to play the Dominância beast automatically and leave after 4 of its turns', () => {
    const sut = new BattleEngine(
      snapshotWith([{ owner: 0, key: 'lobo-de-cinzas' }]),
      new FixedRng([0])
    )
    untilTurnOf(sut, P0)
    const will = sut.unit(P0).stats[Stat.WILL]
    summon(sut, P0)

    let beastTurns = 0
    for (let i = 0; i < 60 && sut.unit('PLAYER:B0').alive; i++) {
      const turn = sut.nextTurn()!
      if (turn.ref === 'PLAYER:B0') {
        expect(turn.auto).toBe(true)
        beastTurns += 1
      }
      sut.act({ type: 'DEFEND', timeout: true })
    }

    expect(beastTurns).toBe(4)
    expect(sut.events.some((e) => e.type === 'BEAST_LEAVE')).toBe(true)
    expect(sut.unit('PLAYER:B0').position).toBeNull()
    expect(sut.unit(P0).stats[Stat.WILL]).toBeCloseTo(will)
  })

  it('should be able to let the player choose the Mestre beast action (not automatic)', () => {
    const sut = new BattleEngine(
      snapshotWith([{ owner: 0, key: 'falcao-de-tempestade' }]),
      new FixedRng([0])
    )
    untilTurnOf(sut, P0)
    summon(sut, P0)

    let turn = sut.nextTurn()!
    while (turn.ref !== 'PLAYER:B0') {
      sut.act({ type: 'DEFEND', timeout: true })
      turn = sut.nextTurn()!
    }

    expect(turn.auto).toBeUndefined()
    const hit = sut.act({
      type: 'SKILL',
      skillKey: 'PLAYER:B0:0',
      targetSide: BattleSide.OPPONENT,
      target: { row: 0, column: 0 },
    })
    expect(hit.isRight()).toBe(true)
  })

  it('should not be able to summon into an occupied cell, twice, or past 2 beasts on the field', () => {
    const sut = new BattleEngine(
      snapshotWith([
        { owner: 0, key: 'lobo-de-cinzas' },
        { owner: 1, key: 'lobo-de-cinzas' },
        { owner: 2, key: 'falcao-de-tempestade' },
      ]),
      new FixedRng([0])
    )
    untilTurnOf(sut, P0)
    expect(summon(sut, P0, { row: 2, column: 0 }).isLeft()).toBe(true)
    expect(summon(sut, P0, { row: 0, column: 1 }).isRight()).toBe(true)

    untilTurnOf(sut, 'PLAYER:1')
    expect(summon(sut, 'PLAYER:1', { row: 0, column: 2 }).isRight()).toBe(true)

    untilTurnOf(sut, 'PLAYER:2')
    const third = summon(sut, 'PLAYER:2', { row: 2, column: 2 })
    expect(third.isLeft() && third.value.message).toMatch(/no máximo 2/)

    untilTurnOf(sut, P0)
    expect(sut.unit(P0).readySkills).not.toContain(sut.skillsOf(P0)[3].key)
  })

  it('should be able to absorb half of each hit with Igualdade and break when the buffer empties', () => {
    const sut = new BattleEngine(
      snapshotWith([{ owner: 0, key: 'serpente-espelho' }]),
      new FixedRng([0])
    )
    untilTurnOf(sut, P0)
    const precision = sut.unit(P0).stats[Stat.PRECISION]

    const done = sut.act({
      type: 'SKILL',
      skillKey: sut.skillsOf(P0)[3].key,
      targetSide: BattleSide.PLAYER,
      target: { row: 0, column: 0 },
    })

    expect(done.isRight()).toBe(true)
    // Rei: buffer de 25% do HP máximo e +12% de Precisão e Esquiva; não ocupa célula
    const buffer = Math.round(sut.unit(P0).maxHp * 0.25)
    expect(sut.unit(P0).equality).toMatchObject({ buffer, turnsLeft: 4 })
    expect(sut.unit(P0).stats[Stat.PRECISION]).toBeCloseTo(precision * 1.12)

    // o inimigo bate até esvaziar o buffer
    let broke = false
    for (let i = 0; i < 80 && !broke && sut.unit(P0).alive; i++) {
      const turn = sut.nextTurn()
      if (!turn) break
      if (turn.ref === O0) {
        sut.act({
          type: 'SKILL',
          skillKey: `${O0}-skill-0`,
          targetSide: BattleSide.PLAYER,
          target: { row: 0, column: 0 },
        })
      } else {
        sut.act({ type: 'DEFEND', timeout: true })
      }
      broke = sut.events.some((e) => e.type === 'EQUALITY_BREAK')
    }

    const absorbed = sut.events.filter((e) => e.type === 'EQUALITY_ABSORB')
    expect(absorbed.length).toBeGreaterThan(0)
    if (broke) {
      expect(sut.unit(P0).equality).toBeNull()
      expect(sut.unit(P0).stats[Stat.PRECISION]).toBeCloseTo(precision)
    } else {
      // a Igualdade acabou pela duração antes de esvaziar
      expect(sut.events.some((e) => e.type === 'BEAST_LEAVE')).toBe(true)
    }
  })
})
