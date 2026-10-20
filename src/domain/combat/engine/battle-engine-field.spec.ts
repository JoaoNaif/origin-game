import { SeededRng } from '@/core/rng/seeded-rng'
import { Stat } from '@/domain/characters/enums/stat'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { makeBattleSnapshot } from 'test/factories/make-battle-snapshot'
import { describe, expect, it } from 'vitest'
import { BattleSide } from '../enums/battle-enums'
import { BattleSnapshot, SnapshotField } from '../value-objects/battle-snapshot'
import { BattleEngine } from './battle-engine'

const field = (key: string, traits: string[]): SnapshotField => ({
  key,
  name: key,
  requiredTraitKeys: traits,
  primaryStat: Stat.ATTACK,
  secondaryStat: Stat.SPEED,
  primaryPercent: 6,
  secondaryPercent: 4,
})

const ARENA = field('arena', ['warrior'])
const FOREST = field('forest', ['stealthy'])

/** PLAYER:0 é guerreiro (qualifica na arena); OPPONENT:0 é furtivo (qualifica na floresta). */
function snapshotWithFields(initial: SnapshotField | null): BattleSnapshot {
  const snapshot = makeBattleSnapshot()
  snapshot.player.units[0].traitKeys = ['warrior']
  snapshot.opponent.units[0].traitKeys = ['stealthy']
  snapshot.field = { initial, catalog: [ARENA, FOREST] }

  // a primeira skill do PLAYER:0 troca o campo (Forte: 2 rodadas, ×1,5)
  snapshot.player.units[0].skills[0] = {
    ...snapshot.player.units[0].skills[0],
    key: 'change-field',
    target: SkillTarget.SELF,
    range: null,
    area: SkillArea.SINGLE,
    baseHitChance: null,
    cooldown: 4,
    effects: [{ type: 'CHANGE_FIELD', duration: 2, multiplier: 1.5 }],
  }

  return snapshot
}

/** Avança até a vez de `ref`, defendendo com todo o resto. */
function untilTurnOf(engine: BattleEngine, ref: string) {
  for (let t = engine.nextTurn(); t; t = engine.nextTurn()) {
    if (t.ref === ref) return t
    engine.act({ type: 'DEFEND' })
  }
  throw new Error('a batalha acabou antes')
}

describe('Battle Engine: battle field (D98)', () => {
  it('should be able to start with the drawn field and show it first', () => {
    const engine = new BattleEngine(snapshotWithFields(ARENA), new SeededRng(1))

    expect(engine.events[0]).toEqual({
      type: 'FIELD',
      fieldKey: 'arena',
      ref: null,
      untilRound: null,
    })
  })

  it('should be able to boost only who has a required trait, on both sides', () => {
    const withField = new BattleEngine(
      snapshotWithFields(ARENA),
      new SeededRng(1)
    )
    const withoutField = new BattleEngine(
      snapshotWithFields(null),
      new SeededRng(1)
    )

    const boosted = withField.unit('PLAYER:0').stats
    const plain = withoutField.unit('PLAYER:0').stats

    expect(boosted.ATTACK).toBeCloseTo(plain.ATTACK * 1.06)
    expect(boosted.SPEED).toBeCloseTo(plain.SPEED * 1.04)
    expect(withField.unit('PLAYER:1').stats.ATTACK).toBeCloseTo(
      withoutField.unit('PLAYER:1').stats.ATTACK
    )
  })

  it('should be able to change the field for N rounds and then go back', () => {
    const engine = new BattleEngine(snapshotWithFields(ARENA), new SeededRng(2))
    const turn = untilTurnOf(engine, 'PLAYER:0')
    const plainAttack = engine.unit('OPPONENT:0').stats.ATTACK

    const result = engine.act({
      type: 'SKILL',
      skillKey: 'change-field',
      targetSide: BattleSide.PLAYER,
      target: { row: 0, column: 0 },
      fieldKey: 'forest',
    })

    expect(result.isRight()).toBe(true)
    expect(engine.activeField).toEqual({
      key: 'forest',
      untilRound: turn.round + 2,
    })
    // na troca o bônus vem ×1,5: +9% de Ataque para quem é furtivo
    expect(engine.unit('OPPONENT:0').stats.ATTACK).toBeCloseTo(
      plainAttack * 1.09
    )

    // passa da última rodada da troca: volta à arena
    for (
      let t = engine.nextTurn();
      t && t.round <= turn.round + 2;
      t = engine.nextTurn()
    ) {
      engine.act({ type: 'DEFEND' })
    }
    expect(engine.activeField).toEqual({ key: 'arena', untilRound: null })
  })

  it('should not be able to change to a field outside the battle catalog', () => {
    const engine = new BattleEngine(snapshotWithFields(ARENA), new SeededRng(2))
    untilTurnOf(engine, 'PLAYER:0')

    const result = engine.act({
      type: 'SKILL',
      skillKey: 'change-field',
      targetSide: BattleSide.PLAYER,
      target: { row: 0, column: 0 },
      fieldKey: 'volcano',
    })

    expect(result.isLeft()).toBe(true)
  })

  it('should be able to fire ON_FIELD_CHANGE passives', () => {
    const snapshot = snapshotWithFields(ARENA)
    snapshot.opponent.units[1].passive = {
      name: 'Adaptável',
      description: '',
      trigger: { type: 'ON_FIELD_CHANGE' },
      effects: [{ type: 'ADVANCE_TURN', percent: 20 }],
    }
    const engine = new BattleEngine(snapshot, new SeededRng(2))
    untilTurnOf(engine, 'PLAYER:0')

    engine.act({
      type: 'SKILL',
      skillKey: 'change-field',
      targetSide: BattleSide.PLAYER,
      target: { row: 0, column: 0 },
      fieldKey: 'forest',
    })

    expect(
      engine.events.some((e) => e.type === 'PASSIVE' && e.ref === 'OPPONENT:1')
    ).toBe(true)
  })
})
