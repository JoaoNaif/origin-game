import { beforeEach, describe, expect, it } from 'vitest'
import { SeededRng } from '@/core/rng/seeded-rng'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { makeAccount } from 'test/factories/make-account'
import { characterOf, makeRoster } from 'test/factories/make-roster'
import { seedCatalog } from 'test/repositories/in-memory-catalog-repository'
import { Character } from '../entities/character'
import { CharacterTemplate } from '../entities/character-template'
import {
  drawSkillOffer,
  skillOfferLevels,
  skillOfferWeight,
} from './skill-offer-draw'

let catalog: GameCatalog
let kael: Character
let template: CharacterTemplate

const draw = (blockLevel: number, excluded: string[] = [], seed = 1) =>
  drawSkillOffer({
    character: kael,
    template,
    skills: catalog.skills.values(),
    blockLevel,
    excludedSkillIds: new Set(excluded),
    rng: new SeededRng(seed),
  })

describe('Skill Offer Draw', () => {
  beforeEach(() => {
    catalog = seedCatalog()
    kael = characterOf(makeRoster(makeAccount(), catalog), catalog, 'kael-vaz')
    template = catalog.templates.get(kael.templateId.toValue())!
  })

  it('should be able to list the block levels crossed on a level up', () => {
    expect(skillOfferLevels(18, 26)).toEqual([20, 25])
    expect(skillOfferLevels(20, 24)).toEqual([])
    expect(skillOfferLevels(0, 5)).toEqual([5])
  })

  it('should be able to favor the skills that just unlocked', () => {
    expect(skillOfferWeight(20, 20)).toBeCloseTo(1.3)
    expect(skillOfferWeight(25, 20)).toBeCloseTo(1.15)
    expect(skillOfferWeight(40, 20)).toBe(1)
  })

  it('should not be able to offer anything before a pool skill unlocks', () => {
    expect(draw(5)).toEqual([])
    expect(draw(15)).toEqual([])
  })

  it('should be able to offer only pool skills of the own variants, unlocked and not learned', () => {
    const offer = draw(60)

    expect(offer.length).toBeGreaterThan(0)
    expect(offer.length).toBeLessThanOrEqual(3)
    expect(new Set(offer.map((s) => s.key)).size).toBe(offer.length)
    for (const skill of offer) {
      expect(skill.isKit).toBe(false)
      expect(skill.minLevel).toBeLessThanOrEqual(60)
      expect(skill.key.startsWith('kael-vaz:')).toBe(true)
      expect(kael.skills.some((s) => s.skill.id.equals(skill.id))).toBe(false)
    }
  })

  it('should be able to offer fewer than 3 when the pool is short', () => {
    // no nível 20 só as 2 Reforçadas do Kael (uma por variante) estão liberadas
    const offer = draw(20)

    expect(offer.map((s) => s.minLevel)).toEqual([20, 20])
  })

  it('should not be able to offer a skill that is in another pending block', () => {
    const reinforced = draw(20).map((s) => s.id.toValue())

    expect(draw(25, reinforced)).toEqual([])
  })

  it('should be able to draw the same block for the same luck', () => {
    expect(draw(60, [], 7).map((s) => s.key)).toEqual(
      draw(60, [], 7).map((s) => s.key)
    )
  })

  it('should be able to guarantee a Strong or Final skill on the milestones', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const offer = draw(50, [], seed)
      expect(offer.some((s) => s.tier === 'STRONG' || s.tier === 'FINAL')).toBe(
        true
      )
    }
  })
})
