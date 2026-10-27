import { beforeEach, describe, expect, it } from 'vitest'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { makeAccount } from 'test/factories/make-account'
import { InMemoryAccountsRepository } from 'test/repositories/in-memory-accounts-repository'
import { InMemoryBattlesRepository } from 'test/repositories/in-memory-battles-repository'
import { FetchBattlesByUsernameUseCase } from './fetch-battles-by-username'

let accountsRepository: InMemoryAccountsRepository
let battlesRepository: InMemoryBattlesRepository
let sut: FetchBattlesByUsernameUseCase

describe('Fetch Battles By Username', () => {
  beforeEach(() => {
    accountsRepository = new InMemoryAccountsRepository()
    battlesRepository = new InMemoryBattlesRepository()
    sut = new FetchBattlesByUsernameUseCase(
      accountsRepository,
      battlesRepository
    )
  })

  it('should be able to fetch the battles of any account', async () => {
    await accountsRepository.create(makeAccount({ username: 'joao_naif' }))

    const result = await sut.execute({ username: 'joao_naif' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) expect(result.value.battles).toEqual([])
  })

  it('should not be able to fetch an unknown account', async () => {
    const result = await sut.execute({ username: 'ninguem' })

    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
