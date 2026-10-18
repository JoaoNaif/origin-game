import { describe, expect, it } from 'vitest'
import {
  applyDamage,
  baseDamage,
  effectivePower,
  finalDamage,
  healAmount,
} from './damage'

describe('Damage', () => {
  describe('Base Damage', () => {
    // Tabela de referência de `classes_brief.md` 4 (Poder 1,0, % do HP do alvo no nível 100)
    it.each([
      ['Vanguarda → Vanguarda', 100, 120, 700, 6.5],
      ['Executor → Atirador', 140, 60, 420, 23.3],
      ['Atirador → Executor', 125, 55, 400, 21.7],
      ['Guardião → Guardião', 60, 140, 780, 2.3],
      ['Suporte → Vanguarda', 70, 120, 700, 3.7],
    ])(
      'should be able to match the reference table %s',
      (_, attack, defense, targetHp, percent) => {
        const damage = baseDamage(1, attack, defense)

        expect((damage / targetHp) * 100).toBeCloseTo(percent, 1)
      }
    )

    it('should be able to scale linearly with power', () => {
      expect(baseDamage(2, 100, 100)).toBe(2 * baseDamage(1, 100, 100))
    })

    it('should never reach zero against a huge defense', () => {
      expect(baseDamage(0.8, 10, 10_000)).toBeGreaterThan(0)
      expect(finalDamage(baseDamage(0.8, 10, 10_000))).toBe(1)
    })
  })

  describe('Effective Power', () => {
    it('should be able to add 15% for an enhanced skill', () => {
      expect(effectivePower(1, true)).toBeCloseTo(1.15)
      expect(effectivePower(1, false)).toBe(1)
    })

    it('should be able to give only part of the enhancement by ranked tier', () => {
      expect(effectivePower(2, true, 0.5)).toBeCloseTo(2.15) // Ouro: metade
      expect(effectivePower(2, true, 0)).toBe(2) // Bronze e Prata
    })
  })

  describe('Heal Amount', () => {
    it('should be able to heal 10% of max HP per 1.0 of power', () => {
      expect(healAmount(1, 700)).toBe(70)
      expect(healAmount(2, 420)).toBe(84)
    })
  })

  describe('Apply Damage', () => {
    it('should be able to absorb with the shield first', () => {
      const sut = applyDamage(50, { hp: 400, shield: 30 })

      expect(sut).toEqual({
        shieldAbsorbed: 30,
        hpLost: 20,
        shieldLeft: 0,
        hpLeft: 380,
      })
    })

    it('should not be able to leave HP below zero', () => {
      const sut = applyDamage(500, { hp: 120, shield: 0 })

      expect(sut.hpLeft).toBe(0)
      expect(sut.hpLost).toBe(120)
    })

    it('should be able to ignore the shield (passive like Ecko)', () => {
      const sut = applyDamage(50, { hp: 400, shield: 30 }, true)

      expect(sut).toMatchObject({
        shieldAbsorbed: 0,
        hpLost: 50,
        shieldLeft: 30,
      })
    })
  })
})
