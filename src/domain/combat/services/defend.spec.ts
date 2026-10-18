import { Lineage } from '@/domain/characters/enums/lineage'
import { Stat } from '@/domain/characters/enums/stat'
import { VANGUARD_STATS } from 'test/factories/make-character-template'
import { beforeEach, describe, expect, it } from 'vitest'
import { UnitConditions } from './conditions'
import { defend } from './defend'
import { DesgasteState } from './desgaste'

describe('Defend', () => {
  let conditions: UnitConditions
  let desgaste: DesgasteState

  beforeEach(() => {
    conditions = new UnitConditions()
    desgaste = new DesgasteState({
      baseStats: VANGUARD_STATS,
      lineages: [Lineage.MATERIAL],
      hasAwakenedSkill: false,
    })
  })

  it('should be able to give +50% defense until its next turn', () => {
    defend(conditions, desgaste)

    expect(conditions.statMultiplier(Stat.DEFENSE)).toBeCloseTo(1.5)

    conditions.startTurn(700)

    expect(conditions.statMultiplier(Stat.DEFENSE)).toBe(1)
  })

  it('should not be able to count against the 2 buff limit', () => {
    conditions.addModifier({
      source: 'a',
      stat: Stat.DEFENSE,
      percent: 20,
      turnsLeft: 3,
    })
    conditions.addModifier({
      source: 'b',
      stat: Stat.DEFENSE,
      percent: 20,
      turnsLeft: 3,
    })

    defend(conditions, desgaste)

    expect(conditions.statMultiplier(Stat.DEFENSE)).toBeCloseTo(1.2 * 1.2 * 1.5)
  })

  it('should be able to relieve 10% of the desgaste', () => {
    desgaste.charge(
      { lineage: Lineage.MATERIAL, isAwakened: false, desgastePercent: 10 },
      700
    ) // perde 12 de Defesa

    defend(conditions, desgaste)

    expect(desgaste.lostOf(Stat.DEFENSE)).toBeCloseTo(10.8)
  })
})
