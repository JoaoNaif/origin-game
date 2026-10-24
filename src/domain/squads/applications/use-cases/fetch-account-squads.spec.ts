import { beforeEach, describe, expect, it } from 'vitest'
import { seedCatalog } from 'test/repositories/in-memory-catalog-repository'
import { InMemorySquadsRepository } from 'test/repositories/in-memory-squads-repository'
import { makeAccount } from 'test/factories/make-account'
import { makeRoster } from 'test/factories/make-roster'
import { makeSquad } from 'test/factories/make-squad'
import { FetchAccountSquadsUseCase } from './fetch-account-squads'

let squadsRepository: InMemorySquadsRepository
let sut: FetchAccountSquadsUseCase

describe('Fetch Account Squads', () => {
  beforeEach(() => {
    squadsRepository = new InMemorySquadsRepository()
    sut = new FetchAccountSquadsUseCase(squadsRepository)
  })

  it('should be able to fetch the squads of the account', async () => {
    const account = makeAccount({ username: 'joao_naif' })
    const roster = makeRoster(account, seedCatalog())
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

    const result = await sut.execute({ accountId: account.id.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.squads.map((s) => s.name)).toEqual(['Muralha'])
    }
  })

  it('should be able to fetch an empty list for an account without squads', async () => {
    const result = await sut.execute({ accountId: 'sem-squads' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) expect(result.value.squads).toEqual([])
  })
})
