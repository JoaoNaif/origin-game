import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAccountsRepository } from 'test/repositories/in-memory-accounts-repository'
import { makeAccount } from 'test/factories/make-account'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { FetchAccountByUsernameUseCase } from './fetch-account-by-username'

let accountsRepository: InMemoryAccountsRepository
let sut: FetchAccountByUsernameUseCase

describe('Fetch Account By Username', () => {
  beforeEach(() => {
    accountsRepository = new InMemoryAccountsRepository()
    sut = new FetchAccountByUsernameUseCase(accountsRepository)
  })

  it('should be able to fetch an account by the exact username', async () => {
    const account = makeAccount({ username: 'joao_naif' })
    await accountsRepository.create(account)

    const result = await sut.execute({ username: 'joao_naif' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.account).toBe(account)
    }
  })

  it('should be able to fetch with other casing and spaces', async () => {
    await accountsRepository.create(makeAccount({ username: 'joao_naif' }))

    const result = await sut.execute({ username: ' Joao_Naif ' })

    expect(result.isRight()).toBe(true)
  })

  it('should not be able to match a partial username', async () => {
    await accountsRepository.create(makeAccount({ username: 'joao_naif' }))

    const result = await sut.execute({ username: 'joao' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })

  it('should not be able to fetch an unknown username', async () => {
    const result = await sut.execute({ username: 'ninguem' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
