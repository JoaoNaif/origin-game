import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Clock } from '@/core/gateways/clock'
import { Account } from '../../entities/account'
import { InvalidAccountError } from '../../errors/invalid-account-error'
import { Encrypter } from '../cryptography/encrypter'
import { HashCompare } from '../cryptography/hash-compare'
import { HashGenerator } from '../cryptography/hash-generator'
import { RefreshTokenGenerator } from '../cryptography/refresh-token-generator'
import { WrongPasswordError } from '../errors/wrong-password-error'
import { AccountsRepository } from '../repositories/accounts-repository'
import { SessionsRepository } from '../repositories/sessions-repository'
import { openSession } from '../services/open-session'

interface UpdateAccountUseCaseRequest {
  accountId: string
  displayName?: string
  /** Obrigatória para trocar a senha. */
  currentPassword?: string
  newPassword?: string
  userAgent?: string | null
}

type UpdateAccountUseCaseResponse = Either<
  ResourceNotFoundError | InvalidAccountError | WrongPasswordError,
  {
    account: Account
    /** Só quando a senha mudou: a sessão nova deste aparelho (as outras caíram). */
    tokens: { accessToken: string; refreshToken: string } | null
  }
>

/**
 * A conta logada muda o nome exibido e a senha (`PATCH /me`); o username e o papel não mudam por aqui. Tudo é
 * conferido antes de gravar: se uma parte falha, nada muda. Trocar a senha apaga todas as sessões da conta (quem
 * tinha um token roubado sai) e abre uma nova para quem trocou.
 */
export class UpdateAccountUseCase {
  constructor(
    private accountsRepository: AccountsRepository,
    private sessionsRepository: SessionsRepository,
    private hashCompare: HashCompare,
    private hashGenerator: HashGenerator,
    private encrypter: Encrypter,
    private refreshTokenGenerator: RefreshTokenGenerator,
    private clock: Clock
  ) {}

  async execute({
    accountId,
    displayName,
    currentPassword,
    newPassword,
    userAgent,
  }: UpdateAccountUseCaseRequest): Promise<UpdateAccountUseCaseResponse> {
    if (displayName === undefined && newPassword === undefined) {
      return left(new InvalidAccountError('nada para mudar'))
    }

    const account = await this.accountsRepository.findById(accountId)

    // conta apagada com o token de acesso ainda válido (até 15 min)
    if (!account) return left(new ResourceNotFoundError('conta'))

    if (displayName !== undefined) {
      const error = Account.displayNameError(displayName.trim())
      if (error) return left(error)
    }

    if (newPassword !== undefined) {
      const error = Account.passwordError(newPassword)
      if (error) return left(error)

      const isPasswordValid =
        currentPassword !== undefined &&
        (await this.hashCompare.compare(currentPassword, account.passwordHash))
      if (!isPasswordValid) return left(new WrongPasswordError())
    }

    if (displayName !== undefined) account.rename(displayName)
    if (newPassword !== undefined) {
      account.changePasswordHash(await this.hashGenerator.hash(newPassword))
    }

    await this.accountsRepository.save(account)

    if (newPassword === undefined) return right({ account, tokens: null })

    await this.sessionsRepository.deleteAllByAccountId(account.id)

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

    return right({ account, tokens })
  }
}
