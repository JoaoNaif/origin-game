import { Either, right } from '@/core/either'
import { Clock } from '@/core/gateways/clock'
import { RefreshTokenGenerator } from '../cryptography/refresh-token-generator'
import { SessionsRepository } from '../repositories/sessions-repository'

interface LogoutUseCaseRequest {
  refreshToken: string
}

type LogoutUseCaseResponse = Either<never, null>

/** Sai: revoga a sessão do refresh token. Token desconhecido ou já revogado não é erro (sair duas vezes dá certo). */
export class LogoutUseCase {
  constructor(
    private sessionsRepository: SessionsRepository,
    private refreshTokenGenerator: RefreshTokenGenerator,
    private clock: Clock
  ) {}

  async execute({
    refreshToken,
  }: LogoutUseCaseRequest): Promise<LogoutUseCaseResponse> {
    const session = await this.sessionsRepository.findByTokenHash(
      this.refreshTokenGenerator.hash(refreshToken)
    )

    if (session && !session.isRevoked) {
      session.revoke(this.clock.now())
      await this.sessionsRepository.save(session)
    }

    return right(null)
  }
}
