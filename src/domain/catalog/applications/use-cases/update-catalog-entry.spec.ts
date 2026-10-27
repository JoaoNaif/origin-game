import { beforeEach, describe, expect, it } from 'vitest'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { InvalidCatalogError } from '@/domain/catalog/errors/invalid-catalog-error'
import { templateKit } from '@/domain/catalog/services/template-skills'
import { CharacterClass } from '@/domain/characters/enums/character-class'
import { Lineage } from '@/domain/characters/enums/lineage'
import { byKey, skillInput } from 'test/factories/make-catalog-input'
import { InMemoryCatalogRepository } from 'test/repositories/in-memory-catalog-repository'
import { UpdateCatalogEntryUseCase } from './update-catalog-entry'

let catalogRepository: InMemoryCatalogRepository
let sut: UpdateCatalogEntryUseCase

describe('Update Catalog Entry', () => {
  beforeEach(() => {
    catalogRepository = new InMemoryCatalogRepository()
    sut = new UpdateCatalogEntryUseCase(catalogRepository)
  })

  it('should be able to update an entry keeping its id and key', async () => {
    const before = byKey(
      (await catalogRepository.load()).variants.values(),
      'sombra'
    )

    const result = await sut.execute({
      kind: 'VARIANT',
      key: 'sombra',
      data: {
        name: 'Sombra Viva',
        lineage: before.lineage,
        description: 'nova',
      },
    })

    expect(result.isRight()).toBe(true)
    const after = catalogRepository.catalog.variants.get(before.id.toValue())!
    expect(after).toMatchObject({ key: 'sombra', name: 'Sombra Viva' })
  })

  it('should not be able to update an unknown entry', async () => {
    const result = await sut.execute({
      kind: 'VARIANT',
      key: 'nao-existe',
      data: { name: 'X', lineage: Lineage.ELEMENTAL },
    })

    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })

  it('should not be able to break the kit of a template', async () => {
    const catalog = await catalogRepository.load()
    const kael = byKey(catalog.templates.values(), 'kael-vaz')
    const [skill] = templateKit(catalog, kael)

    const result = await sut.execute({
      kind: 'SKILL',
      key: skill.key,
      data: {
        ...skillInput(skill, catalog),
        kitClass:
          kael.characterClass === CharacterClass.SUPPORT
            ? CharacterClass.GUARDIAN
            : CharacterClass.SUPPORT,
      },
    })

    expect(result.value).toBeInstanceOf(InvalidCatalogError)
    expect(catalogRepository.catalog.skills.get(skill.id.toValue())).toBe(skill)
  })
})
