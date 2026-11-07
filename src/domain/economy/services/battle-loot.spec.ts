import { describe, expect, it } from 'vitest'
import { SeededRng } from '@/core/rng/seeded-rng'
import { Lineage } from '@/domain/characters/enums/lineage'
import { totalFragments } from '../value-objects/fragments'
import { battleLoot, BattleLootInput } from './battle-loot'

const squad: Lineage[][] = [
  ['ELEMENTAL'],
  ['VECTORIAL', 'MATERIAL'],
  ['PSYCHIC'],
  [],
]

const loot = (override: Partial<BattleLootInput> = {}) =>
  battleLoot({
    won: true,
    modeMultiplier: 1,
    sameNpcMultiplier: 1,
    unitLineages: squad,
    rng: new SeededRng(1),
    ...override,
  })

describe('Battle Loot', () => {
  it('should be able to give 130 coins and 2 fragments for a victory (×1)', () => {
    const sut = loot()

    expect(sut.coins).toBe(130)
    expect(totalFragments(sut.fragments)).toBe(2)
  })

  it('should be able to apply the mode and the same NPC to the coins', () => {
    expect(loot({ modeMultiplier: 0.6 }).coins).toBe(78)
    expect(loot({ won: false, modeMultiplier: 0.6 }).coins).toBe(42)
    expect(loot({ modeMultiplier: 1.4, sameNpcMultiplier: 0.4 }).coins).toBe(72)
  })

  it('should be able to draw the fragment types from the squad (Neutral without variant)', () => {
    const allowed = new Set([
      'ELEMENTAL',
      'VECTORIAL',
      'MATERIAL',
      'PSYCHIC',
      'NONE',
    ])
    const rng = new SeededRng(3)
    const seen = new Set<string>()
    let total = 0

    for (let i = 0; i < 500; i++) {
      const sut = battleLoot({
        won: false,
        modeMultiplier: 0.6,
        sameNpcMultiplier: 1,
        unitLineages: squad,
        rng,
      })
      Object.keys(sut.fragments).forEach((type) => seen.add(type))
      total += totalFragments(sut.fragments)
    }

    expect(seen).toEqual(allowed)
    // derrota no Iniciante: 1 × 0,6 = 0,6 fragmento em média
    expect(total / 500).toBeCloseTo(0.6, 1)
  })

  it('should be able to drop at most one chest, around 26% on a victory and half on a defeat', () => {
    const rate = (won: boolean) => {
      const rng = new SeededRng(11)
      let drops = 0
      for (let i = 0; i < 4000; i++) {
        if (loot({ won, rng }).chestTier) drops++
      }
      return drops / 4000
    }

    expect(rate(true)).toBeCloseTo(0.26, 1)
    expect(rate(false)).toBeCloseTo(0.13, 1)
  })
})
