import { beforeEach, describe, expect, it } from 'vitest'
import { makeAccount } from 'test/factories/make-account'
import { InMemoryAccountsRepository } from 'test/repositories/in-memory-accounts-repository'
import { FetchAccountsUseCase } from './fetch-accounts'

let accountsRepository: InMemoryAccountsRepository
let sut: FetchAccountsUseCase

describe('Fetch Accounts', () => {
  beforeEach(() => {
    accountsRepository = new InMemoryAccountsRepository()
    sut = new FetchAccountsUseCase(accountsRepository)
  })

  it('should be able to fetch every account by username', async () => {
    await accountsRepository.create(makeAccount({ username: 'zeca' }))
    await accountsRepository.create(makeAccount({ username: 'ana' }))

    const result = await sut.execute()

    expect(result.value.accounts.map((s) => s.account.username)).toEqual([
      'ana',
      'zeca',
    ])
  })
})
