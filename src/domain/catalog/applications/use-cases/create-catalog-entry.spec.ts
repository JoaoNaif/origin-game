import { beforeEach, describe, expect, it } from 'vitest'
import { ResourceAlreadyExistsError } from '@/core/errors/err/resource-already-exists-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { InvalidCatalogError } from '@/domain/catalog/errors/invalid-catalog-error'
import { templateKit } from '@/domain/catalog/services/template-skills'
import { Lineage } from '@/domain/characters/enums/lineage'
import { TraitCategory } from '@/domain/characters/enums/trait-category'
import { TraitSource } from '@/domain/characters/enums/trait-source'
import { InvalidTraitError } from '@/domain/characters/errors/invalid-trait-error'
import { NpcSquad } from '@/domain/squads/entities/npc-squad'
import {
  byKey,
  npcSquadInput,
  skillInput,
  templateInput,
} from 'test/factories/make-catalog-input'
import { InMemoryCatalogRepository } from 'test/repositories/in-memory-catalog-repository'
import { CreateCatalogEntryUseCase } from './create-catalog-entry'

let catalogRepository: InMemoryCatalogRepository
let sut: CreateCatalogEntryUseCase

describe('Create Catalog Entry', () => {
  beforeEach(() => {
    catalogRepository = new InMemoryCatalogRepository()
    sut = new CreateCatalogEntryUseCase(catalogRepository)
  })

  it('should be able to create a variant', async () => {
    const result = await sut.execute({
      kind: 'VARIANT',
      key: 'vento',
      data: { name: 'Vento', lineage: Lineage.ELEMENTAL },
    })

    expect(result.isRight()).toBe(true)
    const catalog = await catalogRepository.load()
    expect(byKey(catalog.variants.values(), 'vento').name).toBe('Vento')
  })

  it('should not be able to create with a key already in use', async () => {
    const result = await sut.execute({
      kind: 'VARIANT',
      key: 'gelo-superionico',
      data: { name: 'Gelo', lineage: Lineage.ELEMENTAL },
    })

    expect(result.value).toBeInstanceOf(ResourceAlreadyExistsError)
  })

  it('should not be able to link an unknown key', async () => {
    const result = await sut.execute({
      kind: 'TRAIT',
      key: 'familia-nova',
      data: {
        name: 'Família nova',
        category: TraitCategory.ORIGIN,
        source: TraitSource.TEMPLATE,
        variantKey: 'nao-existe',
        effects: [{ type: 'LINEAGE_COST_MODIFIER', percent: -10 }],
      },
    })

    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })

  it('should not be able to break a rule of the entity', async () => {
    const result = await sut.execute({
      kind: 'TRAIT',
      key: 'vazio',
      data: {
        name: 'Vazio',
        category: TraitCategory.COMBAT,
        source: TraitSource.CONQUERED,
        effects: [],
      },
    })

    expect(result.value).toBeInstanceOf(InvalidTraitError)
  })

  it('should not be able to create a template without its basic kit', async () => {
    const catalog = await catalogRepository.load()
    const kael = byKey(catalog.templates.values(), 'kael-vaz')

    const result = await sut.execute({
      kind: 'TEMPLATE',
      key: 'kael-clone',
      data: templateInput(kael, catalog),
    })

    expect(result.value).toBeInstanceOf(InvalidCatalogError)
    expect(catalogRepository.catalog.templates.size).toBe(12)
  })

  it('should be able to create a template after its kit skills', async () => {
    const catalog = await catalogRepository.load()
    const kael = byKey(catalog.templates.values(), 'kael-vaz')

    for (const skill of templateKit(catalog, kael)) {
      const created = await sut.execute({
        kind: 'SKILL',
        key: skill.key.replace('kael-vaz:', 'kael-clone:'),
        data: skillInput(skill, catalog),
      })
      expect(created.isRight()).toBe(true)
    }

    const result = await sut.execute({
      kind: 'TEMPLATE',
      key: 'kael-clone',
      data: templateInput(kael, catalog),
    })

    expect(result.isRight()).toBe(true)
    expect(catalogRepository.catalog.templates.size).toBe(13)
  })

  it('should be able to create an NPC squad adding the family traits', async () => {
    const catalog = await catalogRepository.load()
    const base = catalog.npcSquads[0]
    const input = npcSquadInput(base, catalog)
    for (const member of input.members) member.traitKeys = []

    const result = await sut.execute({
      kind: 'NPC_SQUAD',
      key: 'npc-copia',
      data: input,
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      const created = result.value.entry.entity as NpcSquad
      created.members.forEach((member, i) => {
        const template = catalog.templates.get(member.templateId.toValue())!
        expect(member.traitIds).toHaveLength(template.familyTraitId ? 1 : 0)
        expect(member.skillIds).toEqual(base.members[i].skillIds)
      })
    }
  })
})
