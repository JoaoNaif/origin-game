import { beforeEach, describe, expect, it } from 'vitest'
import { seedCatalog } from 'test/repositories/in-memory-catalog-repository'
import { InMemorySquadsRepository } from 'test/repositories/in-memory-squads-repository'
import { makeAccount } from 'test/factories/make-account'
import { makeRoster } from 'test/factories/make-roster'
import { makeSquad } from 'test/factories/make-squad'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { DeleteSquadUseCase } from './delete-squad'

let squadsRepository: InMemorySquadsRepository
let sut: DeleteSquadUseCase

describe('Delete Squad', () => {
  beforeEach(() => {
    squadsRepository = new InMemorySquadsRepository()
    sut = new DeleteSquadUseCase(squadsRepository)
  })

  it('should be able to delete a squad', async () => {
    const account = makeAccount()
    const roster = makeRoster(account, seedCatalog())
    const squad = makeSquad({
      account,
      name: 'Muralha',
      members: roster.slice(0, 4).map((character, i) => ({
        character,
        row: i % 3,
        column: i > 2 ? 1 : 0,
      })),
    })
    await squadsRepository.create(squad)

    const result = await sut.execute({
      squadId: squad.id.toString(),
      accountId: account.id.toString(),
    })

    expect(result.isRight()).toBe(true)
    expect(squadsRepository.items).toHaveLength(0)
  })

  it('should not be able to delete the squad of another account', async () => {
    const account = makeAccount()
    const roster = makeRoster(account, seedCatalog())
    const squad = makeSquad({
      account,
      name: 'Muralha',
      members: roster.slice(0, 4).map((character, i) => ({
        character,
        row: i % 3,
        column: i > 2 ? 1 : 0,
      })),
    })
    await squadsRepository.create(squad)

    const result = await sut.execute({
      squadId: squad.id.toString(),
      accountId: 'outra-conta',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(NotAllowedError)
    expect(squadsRepository.items).toHaveLength(1)
  })

  it('should not be able to delete an unknown squad', async () => {
    const result = await sut.execute({
      squadId: 'ninguem',
      accountId: 'qualquer',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
