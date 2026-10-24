import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAccountsRepository } from 'test/repositories/in-memory-accounts-repository'
import { seedCatalog } from 'test/repositories/in-memory-catalog-repository'
import { InMemorySquadsRepository } from 'test/repositories/in-memory-squads-repository'
import { makeAccount } from 'test/factories/make-account'
import { makeRoster } from 'test/factories/make-roster'
import { makeSquad } from 'test/factories/make-squad'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { FetchAccountSquadsUseCase } from './fetch-account-squads'

let accountsRepository: InMemoryAccountsRepository
let squadsRepository: InMemorySquadsRepository
let sut: FetchAccountSquadsUseCase

describe('Fetch Account Squads', () => {
  beforeEach(() => {
    accountsRepository = new InMemoryAccountsRepository()
    squadsRepository = new InMemorySquadsRepository()
    sut = new FetchAccountSquadsUseCase(accountsRepository, squadsRepository)
  })

  it('should be able to fetch the squads of the account', async () => {
    const account = makeAccount({ username: 'joao_naif' })
    const roster = makeRoster(account, seedCatalog())
    await accountsRepository.create(account)
    await squadsRepository.create(
      makeSquad({
        account,
        name: 'Muralha',
        members: roster.slice(0, 4).map((character, i) => ({
          character,
          row: i % 3,
          column: i > 2 ? 1 : 0,
        })),
      })
    )

    const result = await sut.execute({ username: 'joao_naif' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.squads.map((s) => s.name)).toEqual(['Muralha'])
    }
  })

  it('should not be able to fetch the squads of an unknown account', async () => {
    const result = await sut.execute({ username: 'ninguem' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
