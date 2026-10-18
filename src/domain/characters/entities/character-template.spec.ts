import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import {
  makeCharacterTemplateInput,
  VANGUARD_STATS,
} from 'test/factories/make-character-template'
import { makeTrait } from 'test/factories/make-trait'
import { makeVariant } from 'test/factories/make-variant'
import { beforeEach, describe, expect, it } from 'vitest'
import { Lineage } from '../enums/lineage'
import { Stat } from '../enums/stat'
import { TraitSource } from '../enums/trait-source'
import { InvalidCharacterTemplateError } from '../errors/invalid-character-template-error'
import { CharacterTemplate } from './character-template'
import { Variant } from './variant'

describe('Create Character Template', () => {
  let fire: Variant
  let steel: Variant
  let fireId: UniqueEntityId

  beforeEach(() => {
    fireId = new UniqueEntityId('fire-id')
    fire = makeVariant({}, fireId)
    steel = makeVariant(
      { key: 'steel', name: 'Aço', lineage: Lineage.MATERIAL },
      new UniqueEntityId('steel-id')
    )
  })

  it('should be able to create a template without variants', () => {
    const sut = CharacterTemplate.create(makeCharacterTemplateInput())

    expect(sut.isRight()).toBe(true)
    if (sut.isRight()) {
      expect(sut.value.variants).toHaveLength(0)
      expect(sut.value.primaryVariantId).toBeNull()
      expect(sut.value.familyTraitId).toBeNull()
    }
  })

  it('should be able to create a family template with its variant', () => {
    const familyTrait = makeTrait({
      key: 'family-pyranth',
      source: TraitSource.TEMPLATE,
      variantId: fireId,
    })

    const sut = CharacterTemplate.create(
      makeCharacterTemplateInput({
        key: 'kael-pyranth',
        variants: [{ variant: fire, isPrimary: true }],
        familyTrait,
      })
    )

    expect(sut.isRight()).toBe(true)
    if (sut.isRight()) {
      expect(sut.value.familyTraitId?.equals(familyTrait.id)).toBe(true)
      expect(sut.value.primaryVariantId?.equals(fireId)).toBe(true)
    }
  })

  it('should not be able to have more than 3 variants', () => {
    const sut = CharacterTemplate.create(
      makeCharacterTemplateInput({
        variants: ['a', 'b', 'c', 'd'].map((id, index) => ({
          variant: makeVariant({ key: id }, new UniqueEntityId(id)),
          isPrimary: index === 0,
        })),
      })
    )

    expect(sut.isLeft()).toBe(true)
    expect(sut.value).toBeInstanceOf(InvalidCharacterTemplateError)
  })

  it('should not be able to have variants without exactly one primary', () => {
    const sut = CharacterTemplate.create(
      makeCharacterTemplateInput({
        variants: [
          { variant: fire, isPrimary: false },
          { variant: steel, isPrimary: false },
        ],
      })
    )

    expect(sut.isLeft()).toBe(true)
  })

  it('should not be able to repeat a variant', () => {
    const sut = CharacterTemplate.create(
      makeCharacterTemplateInput({
        variants: [
          { variant: fire, isPrimary: true },
          {
            variant: makeVariant({}, new UniqueEntityId('fire-id')),
            isPrimary: false,
          },
        ],
      })
    )

    expect(sut.isLeft()).toBe(true)
  })

  it('should not be able to use a conquered trait as family', () => {
    const sut = CharacterTemplate.create(
      makeCharacterTemplateInput({ familyTrait: makeTrait() })
    )

    expect(sut.isLeft()).toBe(true)
  })

  it('should not be able to have a family without its variant', () => {
    const familyTrait = makeTrait({
      key: 'family-pyranth',
      source: TraitSource.TEMPLATE,
      variantId: fireId,
    })

    const sut = CharacterTemplate.create(
      makeCharacterTemplateInput({
        variants: [{ variant: steel, isPrimary: true }],
        familyTrait,
      })
    )

    expect(sut.isLeft()).toBe(true)
  })

  it('should not be able to exceed the class budget tolerance', () => {
    const sut = CharacterTemplate.create(
      makeCharacterTemplateInput({
        stats: { ...VANGUARD_STATS, [Stat.ATTACK]: 140 },
      })
    )

    expect(sut.isLeft()).toBe(true)
  })

  it('should be able to adjust stats within the class budget tolerance', () => {
    const sut = CharacterTemplate.create(
      makeCharacterTemplateInput({
        stats: { ...VANGUARD_STATS, [Stat.ATTACK]: 110, [Stat.DEFENSE]: 110 },
      })
    )

    expect(sut.isRight()).toBe(true)
  })

  it('should not be able to create a template without a passive effect', () => {
    const sut = CharacterTemplate.create(
      makeCharacterTemplateInput({
        passive: {
          name: 'Nada',
          description: '',
          trigger: { type: 'ALWAYS' },
          effects: [],
        },
      })
    )

    expect(sut.isLeft()).toBe(true)
  })

  it('should not be able to start with an awakened variant', () => {
    const blueFire = makeVariant({
      key: 'blue-fire',
      name: 'Fogo azul',
      awakensFrom: fire,
    })

    const sut = CharacterTemplate.create(
      makeCharacterTemplateInput({
        variants: [{ variant: blueFire, isPrimary: true }],
      })
    )

    expect(sut.isLeft()).toBe(true)
  })
})
