import { SeededRng } from '@/core/rng/seeded-rng'
import { FixedRng } from 'test/fakes/fixed-rng'
import { describe, expect, it } from 'vitest'
import { hitChance, roll, statusChance } from './hit'

describe('Hit', () => {
  describe('Hit Chance', () => {
    it('should be able to use the skill base when precision equals evasion', () => {
      expect(hitChance(0.8, 100, 100)).toBeCloseTo(0.8)
    })

    // Exemplos do D92 (base 0,8)
    it.each([
      ['Atirador → Vanguarda', 125, 55, 1],
      ['Atirador → Executor', 125, 115, 0.833],
      ['Vanguarda → Executor', 85, 115, 0.68],
      ['Guardião → Executor', 70, 115, 0.605],
    ])(
      'should be able to match the D92 example %s',
      (_, precision, evasion, expected) => {
        expect(hitChance(0.8, precision, evasion)).toBeCloseTo(expected, 3)
      }
    )

    it('should not be able to go below the 30% floor', () => {
      expect(hitChance(0.8, 10, 200)).toBe(0.3)
    })
  })

  describe('Status Chance', () => {
    it('should not be able to pass the 90% cap', () => {
      // Controlador (Precisão 115) contra Executor (Vontade 55)
      expect(statusChance(0.8, 115, 55)).toBe(0.9)
    })

    it('should be able to lose strength against high will', () => {
      // Guardião (Precisão 70) contra Suporte (Vontade 130), base 0,7
      expect(statusChance(0.7, 70, 130)).toBeCloseTo(0.49)
    })
  })

  describe('Roll', () => {
    it('should be able to hit when the seed value is below the chance', () => {
      expect(roll(new FixedRng([0.79]), 0.8)).toBe(true)
      expect(roll(new FixedRng([0.8]), 0.8)).toBe(false)
    })

    it('should never miss at 100% without spending the seed', () => {
      const rng = new FixedRng([0.99, 0.1])

      expect(roll(rng, 1)).toBe(true)
      expect(rng.next()).toBe(0.99)
    })

    it('should be able to hit about as often as the chance says', () => {
      const rng = new SeededRng(123)
      const hits = Array.from({ length: 10_000 }, () => roll(rng, 0.68)).filter(
        Boolean
      ).length

      expect(hits / 10_000).toBeCloseTo(0.68, 1)
    })
  })
})
