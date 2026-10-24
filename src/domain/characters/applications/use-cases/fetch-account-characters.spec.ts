import { beforeEach, describe, expect, it } from 'vitest'
import { seedCatalog } from 'test/repositories/in-memory-catalog-repository'
import { InMemoryCharactersRepository } from 'test/repositories/in-memory-characters-repository'
import { makeAccount } from 'test/factories/make-account'
import { makeRoster } from 'test/factories/make-roster'
import { FetchAccountCharactersUseCase } from './fetch-account-characters'

let charactersRepository: InMemoryCharactersRepository
let sut: FetchAccountCharactersUseCase

describe('Fetch Account Characters', () => {
  beforeEach(() => {
    charactersRepository = new InMemoryCharactersRepository()
    sut = new FetchAccountCharactersUseCase(charactersRepository)
  })

  it('should be able to fetch only the characters of the account', async () => {
    const catalog = seedCatalog()
    const account = makeAccount({ username: 'joao_naif' })
    const other = makeAccount({ username: 'outra_conta' })
    await charactersRepository.createMany(makeRoster(account, catalog))
    await charactersRepository.createMany(makeRoster(other, catalog))

    const result = await sut.execute({ accountId: account.id.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.characters).toHaveLength(12)
      expect(
        result.value.characters.every((c) => c.accountId.equals(account.id))
      ).toBe(true)
    }
  })
})
