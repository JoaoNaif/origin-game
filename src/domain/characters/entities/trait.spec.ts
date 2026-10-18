import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { describe, expect, it } from 'vitest'
import { Stat } from '../enums/stat'
import { TraitCategory } from '../enums/trait-category'
import { TraitSource } from '../enums/trait-source'
import { InvalidTraitError } from '../errors/invalid-trait-error'
import { Trait } from './trait'

describe('Create Trait', () => {
  it('should be able to create a conquered trait with a downside', () => {
    const sut = Trait.create({
      key: 'berserker',
      name: 'Berserker',
      category: TraitCategory.COMBAT,
      source: TraitSource.CONQUERED,
      effects: [
        { type: 'SKILL_DAMAGE_MODIFIER', range: SkillRange.MELEE, percent: 10 },
        { type: 'STAT_MODIFIER', stat: Stat.DEFENSE, percent: -8 },
      ],
    })

    expect(sut.isRight()).toBe(true)
    if (sut.isRight()) {
      expect(sut.value.effects).toHaveLength(2)
      expect(sut.value.variantId).toBeNull()
    }
  })

  it('should be able to create a family trait tied to a variant', () => {
    const fireId = new UniqueEntityId('fire-id')

    const sut = Trait.create({
      key: 'family-pyranth',
      name: 'Família Pyranth',
      category: TraitCategory.ORIGIN,
      source: TraitSource.TEMPLATE,
      variantId: fireId,
      effects: [
        { type: 'STAT_MODIFIER', stat: Stat.ATTACK, percent: 3 },
        { type: 'STAT_MODIFIER', stat: Stat.HP, percent: 3 },
        { type: 'LINEAGE_COST_MODIFIER', percent: -10 },
      ],
    })

    expect(sut.isRight()).toBe(true)
    if (sut.isRight()) {
      expect(sut.value.variantId?.equals(fireId)).toBe(true)
    }
  })

  it('should not be able to create a trait without effects', () => {
    const sut = Trait.create({
      key: 'empty',
      name: 'Vazio',
      category: TraitCategory.POSTURE,
      source: TraitSource.CONQUERED,
      effects: [],
    })

    expect(sut.isLeft()).toBe(true)
    expect(sut.value).toBeInstanceOf(InvalidTraitError)
  })

  it('should not be able to create a template trait outside ORIGIN', () => {
    const sut = Trait.create({
      key: 'born-warrior',
      name: 'Guerreiro nato',
      category: TraitCategory.COMBAT,
      source: TraitSource.TEMPLATE,
      effects: [{ type: 'STAT_MODIFIER', stat: Stat.ATTACK, percent: 5 }],
    })

    expect(sut.isLeft()).toBe(true)
  })

  it('should not be able to tie a conquered trait to a variant', () => {
    const sut = Trait.create({
      key: 'fire-veteran',
      name: 'Veterano do fogo',
      category: TraitCategory.ORIGIN,
      source: TraitSource.CONQUERED,
      variantId: new UniqueEntityId('fire-id'),
      effects: [{ type: 'STAT_MODIFIER', stat: Stat.WILL, percent: 3 }],
    })

    expect(sut.isLeft()).toBe(true)
  })
})
