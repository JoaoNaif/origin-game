import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Session } from '../../entities/session'
import { Encrypter } from '../cryptography/encrypter'
import { RefreshTokenGenerator } from '../cryptography/refresh-token-generator'
import { SessionsRepository } from '../repositories/sessions-repository'

interface OpenSessionPorts {
  sessionsRepository: SessionsRepository
  encrypter: Encrypter
  refreshTokenGenerator: RefreshTokenGenerator
}

/**
 * Abre uma sessão nova: token de acesso + refresh token, guardando só o hash do refresh. Serve ao login, ao refresh
 * (rotação) e à troca de senha.
 */
export async function openSession(
  { sessionsRepository, encrypter, refreshTokenGenerator }: OpenSessionPorts,
  accountId: UniqueEntityId,
  now: Date,
  userAgent: string | null
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = await encrypter.encrypt({ sub: accountId.toString() })

  // o token puro só existe na resposta; no banco fica apenas o hash
  const refreshToken = refreshTokenGenerator.generate()

  await sessionsRepository.create(
    Session.create({
      accountId,
      tokenHash: refreshTokenGenerator.hash(refreshToken),
      expiresAt: Session.expiresAtFrom(now),
      userAgent,
      createdAt: now,
    })
  )

  return { accessToken, refreshToken }
}
