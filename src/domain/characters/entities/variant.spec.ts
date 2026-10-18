import { describe, expect, it } from 'vitest'
import { Lineage } from '../enums/lineage'
import { InvalidAwakenedVariantError } from '../errors/invalid-awakened-variant-error'
import { InvalidVariantLineageError } from '../errors/invalid-variant-lineage-error'
import { Variant } from './variant'

describe('Create Variant', () => {
  it('should be able to create a variant with a real lineage', () => {
    const sut = Variant.create({
      key: 'fire',
      name: 'Fogo',
      lineage: Lineage.ELEMENTAL,
    })

    expect(sut.isRight()).toBe(true)
    if (sut.isRight()) {
      expect(sut.value.key).toBe('fire')
      expect(sut.value.lineage).toBe(Lineage.ELEMENTAL)
      expect(sut.value.description).toBeNull()
    }
  })

  it('should not be able to create a variant with lineage NONE', () => {
    const sut = Variant.create({
      key: 'none',
      name: 'Nenhuma',
      lineage: Lineage.NONE,
    })

    expect(sut.isLeft()).toBe(true)
    expect(sut.value).toBeInstanceOf(InvalidVariantLineageError)
  })

  it('should be able to create an awakened variant from a base', () => {
    const fire = Variant.create({
      key: 'fire',
      name: 'Fogo',
      lineage: Lineage.ELEMENTAL,
    })
    if (fire.isLeft()) throw fire.value

    const sut = Variant.create({
      key: 'blue-fire',
      name: 'Fogo azul',
      lineage: Lineage.ELEMENTAL,
      awakensFrom: fire.value,
    })

    expect(sut.isRight()).toBe(true)
    if (sut.isRight()) {
      expect(sut.value.isAwakened).toBe(true)
      expect(sut.value.awakensFromId?.equals(fire.value.id)).toBe(true)
      expect(fire.value.isAwakened).toBe(false)
    }
  })

  it('should not be able to awaken into another lineage', () => {
    const fire = Variant.create({
      key: 'fire',
      name: 'Fogo',
      lineage: Lineage.ELEMENTAL,
    })
    if (fire.isLeft()) throw fire.value

    const sut = Variant.create({
      key: 'steel-fire',
      name: 'Fogo de aço',
      lineage: Lineage.MATERIAL,
      awakensFrom: fire.value,
    })

    expect(sut.isLeft()).toBe(true)
    expect(sut.value).toBeInstanceOf(InvalidAwakenedVariantError)
  })

  it('should not be able to awaken from an awakened variant', () => {
    const fire = Variant.create({
      key: 'fire',
      name: 'Fogo',
      lineage: Lineage.ELEMENTAL,
    })
    if (fire.isLeft()) throw fire.value
    const blueFire = Variant.create({
      key: 'blue-fire',
      name: 'Fogo azul',
      lineage: Lineage.ELEMENTAL,
      awakensFrom: fire.value,
    })
    if (blueFire.isLeft()) throw blueFire.value

    const sut = Variant.create({
      key: 'white-fire',
      name: 'Fogo branco',
      lineage: Lineage.ELEMENTAL,
      awakensFrom: blueFire.value,
    })

    expect(sut.isLeft()).toBe(true)
  })
})
