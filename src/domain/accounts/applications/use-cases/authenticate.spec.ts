import { beforeEach, describe, expect, it } from 'vitest'
import { FakeEncrypter } from 'test/cryptography/fake-encrypter'
import { FakeHasher } from 'test/cryptography/fake-hasher'
import { FakeRefreshTokenGenerator } from 'test/cryptography/fake-refresh-token-generator'
import { makeAccount } from 'test/factories/make-account'
import { FakeClock } from 'test/gateways/fake-clock'
import { InMemoryAccountsRepository } from 'test/repositories/in-memory-accounts-repository'
import { InMemorySessionsRepository } from 'test/repositories/in-memory-sessions-repository'
import { WrongCredentialsError } from '../errors/wrong-credentials-error'
import { AuthenticateUseCase } from './authenticate'

let accountsRepository: InMemoryAccountsRepository
let sessionsRepository: InMemorySessionsRepository
let sut: AuthenticateUseCase

describe('Authenticate', () => {
  beforeEach(async () => {
    accountsRepository = new InMemoryAccountsRepository()
    sessionsRepository = new InMemorySessionsRepository()
    sut = new AuthenticateUseCase(
      accountsRepository,
      sessionsRepository,
      new FakeHasher(),
      new FakeEncrypter(),
      new FakeRefreshTokenGenerator(),
      new FakeClock()
    )

    await accountsRepository.create(
      makeAccount({ username: 'joao_naif', passwordHash: '12345678-hashed' })
    )
  })

  it('should be able to log in with username and password', async () => {
    const result = await sut.execute({
      username: 'Joao_Naif',
      password: '12345678',
      userAgent: 'Chrome',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      const account = accountsRepository.items[0]
      expect(JSON.parse(result.value.accessToken)).toEqual({
        sub: account.id.toString(),
      })
      expect(result.value.refreshToken).toBe('refresh-token-1')
    }
    expect(sessionsRepository.items).toHaveLength(1)
    expect(sessionsRepository.items[0]).toMatchObject({
      tokenHash: 'hash:refresh-token-1',
      userAgent: 'Chrome',
    })
  })

  it('should not be able to log in with a wrong password', async () => {
    const result = await sut.execute({
      username: 'joao_naif',
      password: 'errada123',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(WrongCredentialsError)
    expect(sessionsRepository.items).toHaveLength(0)
  })

  it('should not be able to log in with an unknown username', async () => {
    const result = await sut.execute({
      username: 'ninguem',
      password: '12345678',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(WrongCredentialsError)
  })
})
