import { Either, left, right } from '@/core/either'
import { Clock } from '@/core/gateways/clock'
import { Account } from '../../entities/account'
import { Encrypter } from '../cryptography/encrypter'
import { HashCompare } from '../cryptography/hash-compare'
import { RefreshTokenGenerator } from '../cryptography/refresh-token-generator'
import { WrongCredentialsError } from '../errors/wrong-credentials-error'
import { AccountsRepository } from '../repositories/accounts-repository'
import { SessionsRepository } from '../repositories/sessions-repository'
import { openSession } from '../services/open-session'

interface AuthenticateUseCaseRequest {
  username: string
  password: string
  userAgent?: string | null
}

type AuthenticateUseCaseResponse = Either<
  WrongCredentialsError,
  { accessToken: string; refreshToken: string }
>

/** Login: username + senha → token de acesso curto e refresh token (sessão longa, com rotação). */
export class AuthenticateUseCase {
  constructor(
    private accountsRepository: AccountsRepository,
    private sessionsRepository: SessionsRepository,
    private hashCompare: HashCompare,
    private encrypter: Encrypter,
    private refreshTokenGenerator: RefreshTokenGenerator,
    private clock: Clock
  ) {}

  async execute({
    username,
    password,
    userAgent,
  }: AuthenticateUseCaseRequest): Promise<AuthenticateUseCaseResponse> {
    const account = await this.accountsRepository.findByUsername(
      Account.normalizeUsername(username)
    )

    // mesmo erro para username e senha: não revela se a conta existe
    if (!account) return left(new WrongCredentialsError())

    const isPasswordValid = await this.hashCompare.compare(
      password,
      account.passwordHash
    )
    if (!isPasswordValid) return left(new WrongCredentialsError())

    const tokens = await openSession(
      {
        sessionsRepository: this.sessionsRepository,
        encrypter: this.encrypter,
        refreshTokenGenerator: this.refreshTokenGenerator,
      },
      account.id,
      this.clock.now(),
      userAgent ?? null
    )

    return right(tokens)
  }
}
