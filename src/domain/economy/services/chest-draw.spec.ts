import { describe, expect, it } from 'vitest'
import { SeededRng } from '@/core/rng/seeded-rng'
import { Rarity } from '@/domain/characters/enums/rarity'
import { seedCatalog } from 'test/repositories/in-memory-catalog-repository'
import { RARITY_ORDER, RARITY_SALE_VALUE } from '../economy-values'
import { totalFragments } from '../value-objects/fragments'
import { chestRarityChances, drawChest } from './chest-draw'

const catalog = seedCatalog()
const templates = [...catalog.templates.values()]
const starters = new Set(
  templates.filter((t) => t.isStarter).map((t) => t.id.toValue())
)

const percent = (tier: Rarity) =>
  RARITY_ORDER.map((r) => Math.round(chestRarityChances(tier)[r] * 1000) / 10)

describe('Chest Draw', () => {
  it('should be able to follow the rarity table of each chest (3.5)', () => {
    expect(percent('E')).toEqual([70, 21, 6.3, 1.9, 0.6, 0.2, 0.1])
    expect(percent('C')).toEqual([50.4, 25.2, 12.6, 6.3, 3.1, 1.6, 0.8])
    expect(percent('S')).toEqual([14.3, 14.3, 14.3, 14.3, 14.3, 14.3, 14.3])
  })

  it('should be able to give a new character, a coin for a duplicate and the chest fragments', () => {
    const rng = new SeededRng(7)
    const draws = Array.from({ length: 300 }, () =>
      drawChest({ tier: 'E', templates, ownedTemplateIds: starters, rng })
    )

    for (const draw of draws) {
      expect(totalFragments(draw.fragments)).toBe(1)
      if (draw.template) {
        // novo: só os de baú, que a conta ainda não tem
        expect(draw.template.isStarter).toBe(false)
        expect(draw.template.rarity).toBe(draw.rarity)
        expect(draw.coins).toBe(0)
      } else {
        // repetido ou raridade sem personagem: vira moeda pelo valor
        expect(draw.coins).toBe(RARITY_SALE_VALUE[draw.rarity])
      }
    }

    const keys = new Set(draws.flatMap((d) => d.template?.key ?? []))
    // o baú E dá até B: saem os 6 de baú (E, D, C e B), nunca um inicial
    expect(keys).toEqual(
      new Set(templates.filter((t) => !t.isStarter).map((t) => t.key))
    )
    // os iniciais saem como repetidos
    expect(draws.some((d) => d.convertedTemplate?.isStarter)).toBe(true)
  })

  it('should be able to give the same result for the same seed', () => {
    const draw = () =>
      drawChest({
        tier: 'C',
        templates,
        ownedTemplateIds: starters,
        rng: new SeededRng(99),
      })

    expect(draw()).toEqual(draw())
  })
})
