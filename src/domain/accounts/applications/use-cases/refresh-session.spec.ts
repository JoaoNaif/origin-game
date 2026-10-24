import { beforeEach, describe, expect, it } from 'vitest'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { FakeEncrypter } from 'test/cryptography/fake-encrypter'
import { FakeRefreshTokenGenerator } from 'test/cryptography/fake-refresh-token-generator'
import { FakeClock } from 'test/gateways/fake-clock'
import { InMemorySessionsRepository } from 'test/repositories/in-memory-sessions-repository'
import { Session, SessionProps } from '../../entities/session'
import { InvalidSessionError } from '../errors/invalid-session-error'
import { RefreshSessionUseCase } from './refresh-session'

let sessionsRepository: InMemorySessionsRepository
let sut: RefreshSessionUseCase
const accountId = new UniqueEntityId()

const NOW = new Date('2026-10-24T12:00:00.000Z')

function makeSession(token: string, overrides: Partial<SessionProps> = {}) {
  return Session.create({
    accountId,
    tokenHash: `hash:${token}`,
    expiresAt: Session.expiresAtFrom(NOW),
    createdAt: NOW,
    ...overrides,
  })
}

describe('Refresh Session', () => {
  beforeEach(() => {
    sessionsRepository = new InMemorySessionsRepository()
    sut = new RefreshSessionUseCase(
      sessionsRepository,
      new FakeEncrypter(),
      new FakeRefreshTokenGenerator(),
      new FakeClock()
    )
  })

  it('should be able to rotate the refresh token', async () => {
    const session = makeSession('antigo')
    await sessionsRepository.create(session)

    const result = await sut.execute({ refreshToken: 'antigo' })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(JSON.parse(result.value.accessToken)).toEqual({
        sub: accountId.toString(),
      })
      expect(result.value.refreshToken).toBe('refresh-token-1')
    }
    expect(session.isRevoked).toBe(true)
    expect(sessionsRepository.items).toHaveLength(2)
  })

  it('should revoke every session when a used token shows up again', async () => {
    const used = makeSession('copiado', { revokedAt: NOW })
    const other = makeSession('outro')
    await sessionsRepository.create(used)
    await sessionsRepository.create(other)

    const result = await sut.execute({ refreshToken: 'copiado' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidSessionError)
    expect(other.isRevoked).toBe(true)
  })

  it('should not be able to refresh an expired session', async () => {
    await sessionsRepository.create(
      makeSession('vencido', { expiresAt: new Date('2026-01-01T00:00:00Z') })
    )

    const result = await sut.execute({ refreshToken: 'vencido' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidSessionError)
  })

  it('should not be able to refresh an unknown token', async () => {
    const result = await sut.execute({ refreshToken: 'ninguem' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidSessionError)
  })
})
