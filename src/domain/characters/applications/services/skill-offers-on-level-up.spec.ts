import { beforeEach, describe, expect, it } from 'vitest'
import { SeededRng } from '@/core/rng/seeded-rng'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { makeAccount } from 'test/factories/make-account'
import { characterOf, makeRoster } from 'test/factories/make-roster'
import { seedCatalog } from 'test/repositories/in-memory-catalog-repository'
import { Character } from '../../entities/character'
import { xpToNextLevel } from '../../services/level-curve'
import { skillOffersOnLevelUp } from './skill-offers-on-level-up'

const NOW = new Date('2026-10-24T12:00:00.000Z')

let catalog: GameCatalog
let kael: Character

function levelUpTo(character: Character, level: number) {
  while (character.level < level) {
    character.gainXp(xpToNextLevel(character.level))
  }
}

describe('Skill Offers On Level Up', () => {
  beforeEach(() => {
    catalog = seedCatalog()
    kael = characterOf(makeRoster(makeAccount(), catalog), catalog, 'kael-vaz')
  })

  it('should be able to open a block when a multiple of 5 is crossed', () => {
    levelUpTo(kael, 18)
    levelUpTo(kael, 21)

    const offers = skillOffersOnLevelUp({
      character: kael,
      fromLevel: 18,
      catalog,
      pending: [],
      rng: new SeededRng(1),
      now: NOW,
    })

    expect(offers).toHaveLength(1)
    expect(offers[0].level).toBe(20)
    expect(offers[0].characterId.equals(kael.id)).toBe(true)
    expect(offers[0].isPending).toBe(true)
  })

  it('should not be able to open a block without an eligible skill', () => {
    levelUpTo(kael, 11)

    const offers = skillOffersOnLevelUp({
      character: kael,
      fromLevel: 0,
      catalog,
      pending: [],
      rng: new SeededRng(1),
      now: NOW,
    })

    // 5 e 10: o pool do Kael só libera a partir do 20
    expect(offers).toEqual([])
  })

  it('should be able to queue one block per level crossed, without repeating skills', () => {
    levelUpTo(kael, 61)

    const offers = skillOffersOnLevelUp({
      character: kael,
      fromLevel: 0,
      catalog,
      pending: [],
      rng: new SeededRng(1),
      now: NOW,
    })

    const keys = offers.flatMap((o) => o.skillIds.map((id) => id.toValue()))
    expect(offers[0].level).toBe(20)
    expect(offers.map((o) => o.level)).toEqual(
      [...offers.map((o) => o.level)].sort((a, b) => a - b)
    )
    expect(new Set(keys).size).toBe(keys.length)
  })
})
