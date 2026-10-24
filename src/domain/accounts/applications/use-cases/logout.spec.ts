import { beforeEach, describe, expect, it } from 'vitest'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { FakeRefreshTokenGenerator } from 'test/cryptography/fake-refresh-token-generator'
import { FakeClock } from 'test/gateways/fake-clock'
import { InMemorySessionsRepository } from 'test/repositories/in-memory-sessions-repository'
import { Session } from '../../entities/session'
import { LogoutUseCase } from './logout'

let sessionsRepository: InMemorySessionsRepository
let sut: LogoutUseCase

const NOW = new Date('2026-10-24T12:00:00.000Z')

describe('Logout', () => {
  beforeEach(() => {
    sessionsRepository = new InMemorySessionsRepository()
    sut = new LogoutUseCase(
      sessionsRepository,
      new FakeRefreshTokenGenerator(),
      new FakeClock()
    )
  })

  it('should be able to revoke the session of the refresh token', async () => {
    const session = Session.create({
      accountId: new UniqueEntityId(),
      tokenHash: 'hash:meu-token',
      expiresAt: Session.expiresAtFrom(NOW),
      createdAt: NOW,
    })
    await sessionsRepository.create(session)

    const result = await sut.execute({ refreshToken: 'meu-token' })

    expect(result.isRight()).toBe(true)
    expect(session.isRevoked).toBe(true)
  })

  it('should be able to log out with an unknown token', async () => {
    const result = await sut.execute({ refreshToken: 'ninguem' })

    expect(result.isRight()).toBe(true)
  })
})
