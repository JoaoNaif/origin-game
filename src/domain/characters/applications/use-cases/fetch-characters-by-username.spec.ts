import { beforeEach, describe, expect, it } from 'vitest'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { makeAccount } from 'test/factories/make-account'
import { makeRoster } from 'test/factories/make-roster'
import { InMemoryAccountsRepository } from 'test/repositories/in-memory-accounts-repository'
import { seedCatalog } from 'test/repositories/in-memory-catalog-repository'
import { InMemoryCharactersRepository } from 'test/repositories/in-memory-characters-repository'
import { FetchCharactersByUsernameUseCase } from './fetch-characters-by-username'

let accountsRepository: InMemoryAccountsRepository
let charactersRepository: InMemoryCharactersRepository
let sut: FetchCharactersByUsernameUseCase

describe('Fetch Characters By Username', () => {
  beforeEach(() => {
    accountsRepository = new InMemoryAccountsRepository()
    charactersRepository = new InMemoryCharactersRepository()
    sut = new FetchCharactersByUsernameUseCase(
      accountsRepository,
      charactersRepository
    )
  })

  it('should be able to fetch the characters of any account', async () => {
    const account = makeAccount({ username: 'joao_naif' })
    await accountsRepository.create(account)
    await charactersRepository.createMany(makeRoster(account, seedCatalog()))

    const result = await sut.execute({ username: 'Joao_Naif' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) expect(result.value.characters).toHaveLength(12)
  })

  it('should not be able to fetch an unknown account', async () => {
    const result = await sut.execute({ username: 'ninguem' })

    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
