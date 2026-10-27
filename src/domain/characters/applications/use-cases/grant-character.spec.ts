import { beforeEach, describe, expect, it } from 'vitest'
import { ResourceAlreadyExistsError } from '@/core/errors/err/resource-already-exists-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { makeAccount } from 'test/factories/make-account'
import { makeRoster } from 'test/factories/make-roster'
import { InMemoryAccountsRepository } from 'test/repositories/in-memory-accounts-repository'
import { InMemoryCatalogRepository } from 'test/repositories/in-memory-catalog-repository'
import { InMemoryCharactersRepository } from 'test/repositories/in-memory-characters-repository'
import { GrantCharacterUseCase } from './grant-character'

let accountsRepository: InMemoryAccountsRepository
let charactersRepository: InMemoryCharactersRepository
let catalogRepository: InMemoryCatalogRepository
let sut: GrantCharacterUseCase

describe('Grant Character', () => {
  beforeEach(() => {
    accountsRepository = new InMemoryAccountsRepository()
    charactersRepository = new InMemoryCharactersRepository()
    catalogRepository = new InMemoryCatalogRepository()
    sut = new GrantCharacterUseCase(
      accountsRepository,
      charactersRepository,
      catalogRepository
    )
  })

  it('should be able to grant a template the account does not have', async () => {
    await accountsRepository.create(makeAccount({ username: 'joao_naif' }))

    const result = await sut.execute({
      username: 'joao_naif',
      templateKey: 'kael-vaz',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.character.level).toBe(0)
      expect(result.value.character.build).toHaveLength(4)
    }
    expect(charactersRepository.items).toHaveLength(1)
  })

  it('should not be able to grant a template the account already has', async () => {
    const account = makeAccount({ username: 'joao_naif' })
    await accountsRepository.create(account)
    await charactersRepository.createMany(
      makeRoster(account, catalogRepository.catalog)
    )

    const result = await sut.execute({
      username: 'joao_naif',
      templateKey: 'kael-vaz',
    })

    expect(result.value).toBeInstanceOf(ResourceAlreadyExistsError)
  })

  it('should not be able to grant an unknown template', async () => {
    await accountsRepository.create(makeAccount({ username: 'joao_naif' }))

    const result = await sut.execute({
      username: 'joao_naif',
      templateKey: 'nao-existe',
    })

    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
