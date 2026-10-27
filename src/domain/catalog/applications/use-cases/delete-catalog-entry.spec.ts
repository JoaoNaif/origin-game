import { beforeEach, describe, expect, it } from 'vitest'
import { ResourceInUseError } from '@/core/errors/err/resource-in-use-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { InvalidCatalogError } from '@/domain/catalog/errors/invalid-catalog-error'
import { templateSkills } from '@/domain/catalog/services/template-skills'
import { InMemoryCatalogRepository } from 'test/repositories/in-memory-catalog-repository'
import { DeleteCatalogEntryUseCase } from './delete-catalog-entry'

let catalogRepository: InMemoryCatalogRepository
let sut: DeleteCatalogEntryUseCase

describe('Delete Catalog Entry', () => {
  beforeEach(() => {
    catalogRepository = new InMemoryCatalogRepository()
    sut = new DeleteCatalogEntryUseCase(catalogRepository)
  })

  it('should be able to delete an unused entry', async () => {
    const [squad] = catalogRepository.catalog.npcSquads

    const result = await sut.execute({ kind: 'NPC_SQUAD', key: squad.key })

    expect(result.isRight()).toBe(true)
    expect(catalogRepository.catalog.npcSquads).not.toContain(squad)
  })

  it('should not be able to delete an unknown entry', async () => {
    const result = await sut.execute({ kind: 'FIELD', key: 'nao-existe' })

    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })

  it('should not be able to delete an entry used by the catalog', async () => {
    const result = await sut.execute({ kind: 'TEMPLATE', key: 'kael-vaz' })

    expect(result.value).toBeInstanceOf(ResourceInUseError)
    expect(result.value?.message).toContain('kael-vaz:')
  })

  it('should not be able to delete an entry used by a player', async () => {
    const field = catalogRepository.catalog.fields[0]
    catalogRepository.playerUsedIds.add(field.id.toValue())

    const result = await sut.execute({ kind: 'FIELD', key: field.key })

    expect(result.value).toBeInstanceOf(ResourceInUseError)
    expect(result.value?.message).toContain(field.key)
  })

  it('should not be able to delete a kit skill', async () => {
    const catalog = catalogRepository.catalog
    const kitSkill = [...catalog.templates.values()]
      .flatMap((t) => templateSkills(catalog, t))
      .find(
        (s) =>
          s.isKit &&
          !catalog.npcSquads.some((n) =>
            n.members.some((m) => m.skillIds.some((id) => id.equals(s.id)))
          )
      )!

    const result = await sut.execute({ kind: 'SKILL', key: kitSkill.key })

    expect(result.value).toBeInstanceOf(InvalidCatalogError)
  })
})
