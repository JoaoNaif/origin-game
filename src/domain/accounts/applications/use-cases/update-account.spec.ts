import { beforeEach, describe, expect, it } from 'vitest'
import { FakeEncrypter } from 'test/cryptography/fake-encrypter'
import { FakeHasher } from 'test/cryptography/fake-hasher'
import { FakeRefreshTokenGenerator } from 'test/cryptography/fake-refresh-token-generator'
import { makeAccount } from 'test/factories/make-account'
import { FakeClock } from 'test/gateways/fake-clock'
import { InMemoryAccountsRepository } from 'test/repositories/in-memory-accounts-repository'
import { InMemorySessionsRepository } from 'test/repositories/in-memory-sessions-repository'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Account } from '../../entities/account'
import { Session } from '../../entities/session'
import { InvalidAccountError } from '../../errors/invalid-account-error'
import { WrongPasswordError } from '../errors/wrong-password-error'
import { UpdateAccountUseCase } from './update-account'

let accountsRepository: InMemoryAccountsRepository
let sessionsRepository: InMemorySessionsRepository
let account: Account
let sut: UpdateAccountUseCase

describe('Update Account', () => {
  beforeEach(async () => {
    accountsRepository = new InMemoryAccountsRepository()
    sessionsRepository = new InMemorySessionsRepository()
    sut = new UpdateAccountUseCase(
      accountsRepository,
      sessionsRepository,
      new FakeHasher(),
      new FakeHasher(),
      new FakeEncrypter(),
      new FakeRefreshTokenGenerator(),
      new FakeClock()
    )

    account = makeAccount({ passwordHash: '12345678-hashed' })
    await accountsRepository.create(account)
    await sessionsRepository.create(
      Session.create({
        accountId: account.id,
        tokenHash: 'hash:outro-aparelho',
        expiresAt: new Date('2026-11-30T00:00:00.000Z'),
        createdAt: new Date('2026-10-24T00:00:00.000Z'),
      })
    )
  })

  it('should be able to change the display name', async () => {
    const result = await sut.execute({
      accountId: account.id.toString(),
      displayName: '  Novo Nome ',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) expect(result.value.tokens).toBeNull()
    expect(accountsRepository.items[0].displayName).toBe('Novo Nome')
    expect(accountsRepository.items[0].username).toBe('tester_01')
    expect(sessionsRepository.items).toHaveLength(1)
  })

  it('should be able to change the password with the current one', async () => {
    const result = await sut.execute({
      accountId: account.id.toString(),
      currentPassword: '12345678',
      newPassword: 'senha-nova',
      userAgent: 'Firefox',
    })

    expect(result.isRight()).toBe(true)
    expect(accountsRepository.items[0].passwordHash).toBe('senha-nova-hashed')
    if (result.isRight()) {
      expect(result.value.tokens).toEqual({
        accessToken: JSON.stringify({ sub: account.id.toString() }),
        refreshToken: 'refresh-token-1',
      })
    }
  })

  it('should be able to end the other sessions when the password changes', async () => {
    await sut.execute({
      accountId: account.id.toString(),
      currentPassword: '12345678',
      newPassword: 'senha-nova',
    })

    expect(sessionsRepository.items).toHaveLength(1)
    expect(sessionsRepository.items[0]).toMatchObject({
      tokenHash: 'hash:refresh-token-1',
      revokedAt: null,
    })
  })

  it('should not be able to change the password with a wrong current password', async () => {
    const result = await sut.execute({
      accountId: account.id.toString(),
      currentPassword: 'errada123',
      newPassword: 'senha-nova',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(WrongPasswordError)
    expect(accountsRepository.items[0].passwordHash).toBe('12345678-hashed')
    expect(sessionsRepository.items).toHaveLength(1)
  })

  it('should not be able to change the password without the current one', async () => {
    const result = await sut.execute({
      accountId: account.id.toString(),
      newPassword: 'senha-nova',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(WrongPasswordError)
  })

  it('should not be able to use a new password shorter than 8 characters', async () => {
    const result = await sut.execute({
      accountId: account.id.toString(),
      currentPassword: '12345678',
      newPassword: '1234567',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidAccountError)
  })

  it('should not be able to change anything when one part is invalid', async () => {
    const result = await sut.execute({
      accountId: account.id.toString(),
      displayName: 'Novo Nome',
      currentPassword: 'errada123',
      newPassword: 'senha-nova',
    })

    expect(result.isLeft()).toBe(true)
    expect(accountsRepository.items[0].displayName).toBe('Tester')
  })

  it('should not be able to use a display name shorter than 2 characters', async () => {
    const result = await sut.execute({
      accountId: account.id.toString(),
      displayName: ' J ',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidAccountError)
    expect(accountsRepository.items[0].displayName).toBe('Tester')
  })

  it('should not be able to update without anything to change', async () => {
    const result = await sut.execute({ accountId: account.id.toString() })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidAccountError)
  })

  it('should not be able to update a deleted account', async () => {
    const result = await sut.execute({
      accountId: 'apagada',
      displayName: 'Novo Nome',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
