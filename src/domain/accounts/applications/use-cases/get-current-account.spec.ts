import { beforeEach, describe, expect, it } from 'vitest'
import { makeAccount } from 'test/factories/make-account'
import { InMemoryAccountsRepository } from 'test/repositories/in-memory-accounts-repository'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { GetCurrentAccountUseCase } from './get-current-account'

let accountsRepository: InMemoryAccountsRepository
let sut: GetCurrentAccountUseCase

describe('Get Current Account', () => {
  beforeEach(() => {
    accountsRepository = new InMemoryAccountsRepository()
    sut = new GetCurrentAccountUseCase(accountsRepository)
  })

  it('should be able to get the logged account', async () => {
    const account = makeAccount()
    await accountsRepository.create(account)

    const result = await sut.execute({ accountId: account.id.toString() })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) expect(result.value.account).toBe(account)
  })

  it('should not be able to get a deleted account', async () => {
    const result = await sut.execute({ accountId: 'apagada' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
