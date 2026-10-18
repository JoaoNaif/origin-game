import { VANGUARD_STATS } from 'test/factories/make-character-template'
import { describe, expect, it } from 'vitest'
import { EMPTY_FREE_POINTS } from '../entities/character'
import { Stat } from '../enums/stat'
import { StatBlock } from '../value-objects/stat-block'
import { defaultFreePoints } from './free-points'
import { baseGrowth, computeStats, traitPercents } from './stat-calculator'

const points = (override: Partial<StatBlock>): StatBlock => ({
  ...EMPTY_FREE_POINTS,
  ...override,
})

describe('Stat Calculator', () => {
  describe('Base Growth', () => {
    it('should be able to grow linearly from 40% to 100% of the base', () => {
      expect(baseGrowth(0)).toBe(0.4)
      expect(baseGrowth(50)).toBeCloseTo(0.7)
      expect(baseGrowth(100)).toBe(1)
    })
  })

  describe('Compute Stats', () => {
    it('should be able to give 34% of the profile at level 0', () => {
      const sut = computeStats({
        profile: VANGUARD_STATS,
        level: 0,
        freePoints: EMPTY_FREE_POINTS,
      })

      // Vanguarda: 700 / 100 / 120 / 75 / 85 / 55 / 95 × 0,34
      expect(sut).toEqual({
        HP: 238,
        ATTACK: 34,
        DEFENSE: 41,
        SPEED: 26,
        PRECISION: 29,
        EVASION: 19,
        WILL: 32,
      })
    })

    it('should be able to give 85% of the profile at level 100 without free points', () => {
      const sut = computeStats({
        profile: VANGUARD_STATS,
        level: 100,
        freePoints: EMPTY_FREE_POINTS,
      })

      expect(sut.HP).toBe(595)
      expect(sut.ATTACK).toBe(85)
      expect(sut.DEFENSE).toBe(102)
    })

    it('should be able to add free points, with HP worth 5 per point', () => {
      const sut = computeStats({
        profile: VANGUARD_STATS,
        level: 100,
        freePoints: points({ HP: 10, DEFENSE: 18 }),
      })

      expect(sut.HP).toBe(645)
      expect(sut.DEFENSE).toBe(120)
    })

    it('should be able to rebuild the profile with the default distribution at level 100', () => {
      const sut = computeStats({
        profile: VANGUARD_STATS,
        level: 100,
        freePoints: defaultFreePoints(VANGUARD_STATS, 100),
      })

      for (const stat of Object.values(Stat)) {
        expect(Math.abs(sut[stat] - VANGUARD_STATS[stat])).toBeLessThanOrEqual(
          1
        )
      }
    })

    it('should be able to apply trait percents after base and free points', () => {
      const sut = computeStats({
        profile: VANGUARD_STATS,
        level: 100,
        freePoints: EMPTY_FREE_POINTS,
        traitEffects: [
          { type: 'STAT_MODIFIER', stat: Stat.ATTACK, percent: 10 },
          { type: 'STAT_MODIFIER', stat: Stat.DEFENSE, percent: -8 },
        ],
      })

      expect(sut.ATTACK).toBe(94) // 85 × 1,10 = 93,5
      expect(sut.DEFENSE).toBe(94) // 102 × 0,92 = 93,84
    })

    it('should not be able to pass +15% from traits on one stat', () => {
      const sut = computeStats({
        profile: VANGUARD_STATS,
        level: 100,
        freePoints: EMPTY_FREE_POINTS,
        traitEffects: [
          { type: 'STAT_MODIFIER', stat: Stat.ATTACK, percent: 10 },
          { type: 'STAT_MODIFIER', stat: Stat.ATTACK, percent: 10 },
        ],
      })

      expect(sut.ATTACK).toBe(98) // 85 × 1,15 = 97,75
    })

    it('should ignore trait effects that are not stat modifiers', () => {
      const sut = traitPercents([
        { type: 'EXTRA_BEAST_SLOT', count: 1 },
        { type: 'LINEAGE_COST_MODIFIER', percent: -10 },
      ])

      expect(Object.values(sut).every((value) => value === 0)).toBe(true)
    })
  })

  describe('Default Free Points', () => {
    it('should be able to give no points before level 10', () => {
      const sut = defaultFreePoints(VANGUARD_STATS, 9)

      expect(Object.values(sut).every((value) => value === 0)).toBe(true)
    })

    it('should be able to follow the profile proportion without passing the level total', () => {
      const sut = defaultFreePoints(VANGUARD_STATS, 100)
      const total = Object.values(sut).reduce((sum, value) => sum + value, 0)

      expect(sut).toEqual({
        HP: 21,
        ATTACK: 15,
        DEFENSE: 18,
        SPEED: 11,
        PRECISION: 12,
        EVASION: 8,
        WILL: 14,
      })
      expect(total).toBeLessThanOrEqual(100)
    })

    it('should be able to scale with the points granted at the level', () => {
      const sut = defaultFreePoints(VANGUARD_STATS, 50)

      expect(sut.DEFENSE).toBe(9) // metade de 18
    })
  })
})
