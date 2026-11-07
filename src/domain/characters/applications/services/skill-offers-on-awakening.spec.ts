import { beforeEach, describe, expect, it } from 'vitest'
import { SeededRng } from '@/core/rng/seeded-rng'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { makeAccount } from 'test/factories/make-account'
import { characterOf, makeRoster } from 'test/factories/make-roster'
import { seedCatalog } from 'test/repositories/in-memory-catalog-repository'
import { Character } from '../../entities/character'
import { SkillOffer } from '../../entities/skill-offer'
import { drawSkillOffer } from '../../services/skill-offer-draw'
import { skillOffersOnAwakening } from './skill-offers-on-level-up'

let catalog: GameCatalog
let gaia: Character

const awakenedSkills = (offer: SkillOffer) =>
  offer.skillIds.filter((id) => catalog.skills.get(id.toValue())!.isAwakened)

const offersOnAwakening = (pending: SkillOffer[] = [], seed = 1) =>
  skillOffersOnAwakening({
    character: gaia,
    catalog,
    pending,
    rng: new SeededRng(seed),
    now: new Date('2026-11-07T12:00:00Z'),
  })

function awaken(character: Character) {
  const template = catalog.templates.get(character.templateId.toValue())!
  const cristal = [...catalog.variants.values()].find(
    (v) => v.key === 'cristal'
  )!
  const result = character.awaken(cristal, template)
  if (result.isLeft()) throw result.value
}

describe('Skill Offers On Awakening', () => {
  beforeEach(() => {
    catalog = seedCatalog()
    gaia = characterOf(makeRoster(makeAccount(), catalog, 95), catalog, 'gaia')
  })

  it('should be able to open one catch-up block per awakened level already reached', () => {
    awaken(gaia)

    const offers = offersOnAwakening()

    expect(offers.map((o) => o.level)).toEqual([80, 85, 90, 95])
    for (const offer of offers) {
      expect(offer.source).toBe('AWAKENING')
      expect(awakenedSkills(offer).length).toBeGreaterThanOrEqual(1)
    }
    // as 4 despertadas liberadas até o 95 aparecem, sem repetir entre os blocos
    const all = offers.flatMap((o) => o.skillIds.map((id) => id.toValue()))
    expect(new Set(all).size).toBe(all.length)
  })

  it('should not be able to open a catch-up block without an awakened skill left', () => {
    awaken(gaia)
    const awakened = [...catalog.skills.values()].filter(
      (s) => s.isAwakened && s.key.startsWith('gaia:') && s.minLevel <= 85
    )
    const pending = SkillOffer.create({
      characterId: gaia.id,
      level: 85,
      skillIds: awakened.map((s) => s.id),
      createdAt: new Date(),
    })
    if (pending.isLeft()) throw pending.value

    // as despertadas do 80 e do 85 já estão em outro bloco: os blocos do 80 e do 85 não abrem
    expect(offersOnAwakening([pending.value]).map((o) => o.level)).toEqual([
      90, 95,
    ])
  })

  it('should not be able to open catch-up blocks before awakening', () => {
    expect(offersOnAwakening()).toEqual([])
  })

  it('should be able to guarantee an awakened skill in the normal blocks after awakening', () => {
    awaken(gaia)
    const template = catalog.templates.get(gaia.templateId.toValue())!

    for (let seed = 1; seed <= 20; seed++) {
      const offer = drawSkillOffer({
        character: gaia,
        template,
        skills: catalog.skills.values(),
        blockLevel: 100,
        excludedSkillIds: new Set(),
        rng: new SeededRng(seed),
      })
      expect(offer.some((s) => s.isAwakened)).toBe(true)
      // o marco do 100 segue garantindo uma Forte ou Final
      expect(offer.some((s) => s.tier === 'STRONG' || s.tier === 'FINAL')).toBe(
        true
      )
    }
  })
})
