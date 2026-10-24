import { Either, left, right } from '@/core/either'
import { Clock } from '@/core/gateways/clock'
import { Session } from '../../entities/session'
import { Encrypter } from '../cryptography/encrypter'
import { RefreshTokenGenerator } from '../cryptography/refresh-token-generator'
import { InvalidSessionError } from '../errors/invalid-session-error'
import { SessionsRepository } from '../repositories/sessions-repository'

interface RefreshSessionUseCaseRequest {
  refreshToken: string
  userAgent?: string | null
}

type RefreshSessionUseCaseResponse = Either<
  InvalidSessionError,
  { accessToken: string; refreshToken: string }
>

/** Renova o par de tokens com rotação: o refresh token atual deixa de valer e um novo é emitido. */
export class RefreshSessionUseCase {
  constructor(
    private sessionsRepository: SessionsRepository,
    private encrypter: Encrypter,
    private refreshTokenGenerator: RefreshTokenGenerator,
    private clock: Clock
  ) {}

  async execute({
    refreshToken,
    userAgent,
  }: RefreshSessionUseCaseRequest): Promise<RefreshSessionUseCaseResponse> {
    const now = this.clock.now()
    const session = await this.sessionsRepository.findByTokenHash(
      this.refreshTokenGenerator.hash(refreshToken)
    )
    if (!session) return left(new InvalidSessionError())

    // token já usado apareceu de novo: alguém o copiou; derruba todas as sessões da conta
    if (session.isRevoked) {
      await this.sessionsRepository.revokeAllByAccountId(session.accountId, now)

      return left(new InvalidSessionError())
    }

    if (session.isExpired(now)) return left(new InvalidSessionError())

    session.revoke(now)
    await this.sessionsRepository.save(session)

    const accessToken = await this.encrypter.encrypt({
      sub: session.accountId.toString(),
    })
    const newRefreshToken = this.refreshTokenGenerator.generate()

    await this.sessionsRepository.create(
      Session.create({
        accountId: session.accountId,
        tokenHash: this.refreshTokenGenerator.hash(newRefreshToken),
        expiresAt: Session.expiresAtFrom(now),
        userAgent: userAgent ?? session.userAgent,
        createdAt: now,
      })
    )

    return right({ accessToken, refreshToken: newRefreshToken })
  }
}
