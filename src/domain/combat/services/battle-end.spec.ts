import { Lineage } from '@/domain/characters/enums/lineage'
import { VANGUARD_STATS } from 'test/factories/make-character-template'
import { FixedRng } from 'test/fakes/fixed-rng'
import { describe, expect, it } from 'vitest'
import { BattleEndReason, BattleSide } from '../enums/battle-enums'
import {
  checkElimination,
  damageMultiplier,
  forcedEnd,
  healMultiplier,
  hpShare,
  isForcedEnd,
  SideSummary,
} from './battle-end'
import { DesgasteState } from './desgaste'

const side = (
  battleSide: BattleSide,
  hps: number[],
  desgaste = 0,
  maxHp = 500
): SideSummary => ({
  side: battleSide,
  units: hps.map((hp) => ({ hp, startingMaxHp: maxHp })),
  desgaste,
})

describe('Battle End', () => {
  describe('Exhaustion', () => {
    it('should be able to stay normal until round 15', () => {
      expect(healMultiplier(15)).toBe(1)
      expect(damageMultiplier(15)).toBe(1)
    })

    it('should be able to cut healing 10% and add 5% damage per round from 16', () => {
      expect(healMultiplier(16)).toBeCloseTo(0.9)
      expect(damageMultiplier(16)).toBeCloseTo(1.05)
      expect(healMultiplier(20)).toBeCloseTo(0.5)
      expect(damageMultiplier(20)).toBeCloseTo(1.25)
    })

    it('should be able to reach zero healing on round 25 and +75% damage on round 30', () => {
      expect(healMultiplier(25)).toBeCloseTo(0)
      expect(healMultiplier(30)).toBe(0)
      expect(damageMultiplier(30)).toBeCloseTo(1.75)
    })

    it('should be able to force the end when round 30 closes', () => {
      expect(isForcedEnd(29)).toBe(false)
      expect(isForcedEnd(30)).toBe(true)
    })
  })

  describe('Elimination', () => {
    it('should be able to keep going while both sides have someone alive', () => {
      expect(
        checkElimination(
          side(BattleSide.PLAYER, [100, 0, 0, 0]),
          side(BattleSide.OPPONENT, [0, 0, 0, 1]),
          new FixedRng()
        )
      ).toBeNull()
    })

    it('should be able to give the win to who still has someone alive', () => {
      expect(
        checkElimination(
          side(BattleSide.PLAYER, [100, 0, 0, 0]),
          side(BattleSide.OPPONENT, [0, 0, 0, 0]),
          new FixedRng()
        )
      ).toEqual({
        winner: BattleSide.PLAYER,
        reason: BattleEndReason.ELIMINATION,
      })
    })
  })

  describe('Forced end (D72)', () => {
    it('should be able to give the win to the side with more total HP share', () => {
      const result = forcedEnd(
        side(BattleSide.PLAYER, [250, 0, 0, 0]), // 12,5%
        side(BattleSide.OPPONENT, [100, 100, 0, 0]), // 10%
        new FixedRng()
      )

      expect(result).toEqual({
        winner: BattleSide.PLAYER,
        reason: BattleEndReason.ROUND_LIMIT,
      })
    })

    it('should be able to use the starting max HP (Fundamental does not help)', () => {
      expect(hpShare(side(BattleSide.PLAYER, [400, 400], 0, 500))).toBeCloseTo(
        0.8
      )
    })

    it('should be able to break an HP tie by the lower desgaste', () => {
      const result = forcedEnd(
        side(BattleSide.PLAYER, [200, 0], 0.4),
        side(BattleSide.OPPONENT, [100, 100], 0.1),
        new FixedRng()
      )

      expect(result.winner).toBe(BattleSide.OPPONENT)
    })

    it('should be able to break a full tie with the seed', () => {
      const tied = () => [
        side(BattleSide.PLAYER, [200], 0.2),
        side(BattleSide.OPPONENT, [200], 0.2),
      ]

      const [p1, o1] = tied()
      const [p2, o2] = tied()

      expect(forcedEnd(p1, o1, new FixedRng([0])).winner).toBe(
        BattleSide.PLAYER
      )
      expect(forcedEnd(p2, o2, new FixedRng([0.99])).winner).toBe(
        BattleSide.OPPONENT
      )
    })
  })

  it('should be able to measure the side desgaste as stat fractions', () => {
    const desgaste = new DesgasteState({
      baseStats: VANGUARD_STATS,
      lineages: [Lineage.MATERIAL],
      hasAwakenedSkill: false,
    })

    desgaste.charge(
      { lineage: Lineage.MATERIAL, isAwakened: false, desgastePercent: 10 },
      700
    )

    expect(desgaste.totalFraction()).toBeCloseTo(0.1) // 12 de 120 de Defesa
  })
})
