import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAccountsRepository } from 'test/repositories/in-memory-accounts-repository'
import { seedCatalog } from 'test/repositories/in-memory-catalog-repository'
import { InMemoryCharactersRepository } from 'test/repositories/in-memory-characters-repository'
import { makeAccount } from 'test/factories/make-account'
import { makeRoster } from 'test/factories/make-roster'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { FetchAccountCharactersUseCase } from './fetch-account-characters'

let accountsRepository: InMemoryAccountsRepository
let charactersRepository: InMemoryCharactersRepository
let sut: FetchAccountCharactersUseCase

describe('Fetch Account Characters', () => {
  beforeEach(() => {
    accountsRepository = new InMemoryAccountsRepository()
    charactersRepository = new InMemoryCharactersRepository()
    sut = new FetchAccountCharactersUseCase(
      accountsRepository,
      charactersRepository
    )
  })

  it('should be able to fetch only the characters of the account', async () => {
    const catalog = seedCatalog()
    const account = makeAccount({ username: 'joao_naif' })
    const other = makeAccount({ username: 'outra_conta' })
    await accountsRepository.create(account)
    await accountsRepository.create(other)
    await charactersRepository.createMany(makeRoster(account, catalog))
    await charactersRepository.createMany(makeRoster(other, catalog))

    const result = await sut.execute({ username: 'Joao_Naif' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.characters).toHaveLength(12)
      expect(
        result.value.characters.every((c) => c.accountId.equals(account.id))
      ).toBe(true)
    }
  })

  it('should not be able to fetch the characters of an unknown account', async () => {
    const result = await sut.execute({ username: 'ninguem' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
