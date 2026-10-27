import { Provider } from '@nestjs/common'
import { Clock } from '@/core/gateways/clock'
import { Encrypter } from '@/domain/accounts/applications/cryptography/encrypter'
import { HashCompare } from '@/domain/accounts/applications/cryptography/hash-compare'
import { HashGenerator } from '@/domain/accounts/applications/cryptography/hash-generator'
import { RefreshTokenGenerator } from '@/domain/accounts/applications/cryptography/refresh-token-generator'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { SessionsRepository } from '@/domain/accounts/applications/repositories/sessions-repository'
import { AuthenticateUseCase } from '@/domain/accounts/applications/use-cases/authenticate'
import { CreateAccountUseCase } from '@/domain/accounts/applications/use-cases/create-account'
import { FetchAccountByUsernameUseCase } from '@/domain/accounts/applications/use-cases/fetch-account-by-username'
import { GetCurrentAccountUseCase } from '@/domain/accounts/applications/use-cases/get-current-account'
import { LogoutUseCase } from '@/domain/accounts/applications/use-cases/logout'
import { RefreshSessionUseCase } from '@/domain/accounts/applications/use-cases/refresh-session'
import { UpdateAccountUseCase } from '@/domain/accounts/applications/use-cases/update-account'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'

// O domain não tem decorators, então cada use-case é montado por factory com
// os ports resolvidos pelo Nest. A própria classe do use-case é o token de DI.
export const accountsUseCases: Provider[] = [
  {
    provide: CreateAccountUseCase,
    inject: [
      AccountsRepository,
      CharactersRepository,
      CatalogRepository,
      HashGenerator,
    ],
    useFactory: (
      accounts: AccountsRepository,
      characters: CharactersRepository,
      catalog: CatalogRepository,
      hasher: HashGenerator
    ) => new CreateAccountUseCase(accounts, characters, catalog, hasher),
  },
  {
    provide: FetchAccountByUsernameUseCase,
    inject: [AccountsRepository],
    useFactory: (accounts: AccountsRepository) =>
      new FetchAccountByUsernameUseCase(accounts),
  },
  {
    provide: AuthenticateUseCase,
    inject: [
      AccountsRepository,
      SessionsRepository,
      HashCompare,
      Encrypter,
      RefreshTokenGenerator,
      Clock,
    ],
    useFactory: (
      accounts: AccountsRepository,
      sessions: SessionsRepository,
      hashCompare: HashCompare,
      encrypter: Encrypter,
      refreshTokens: RefreshTokenGenerator,
      clock: Clock
    ) =>
      new AuthenticateUseCase(
        accounts,
        sessions,
        hashCompare,
        encrypter,
        refreshTokens,
        clock
      ),
  },
  {
    provide: RefreshSessionUseCase,
    inject: [SessionsRepository, Encrypter, RefreshTokenGenerator, Clock],
    useFactory: (
      sessions: SessionsRepository,
      encrypter: Encrypter,
      refreshTokens: RefreshTokenGenerator,
      clock: Clock
    ) => new RefreshSessionUseCase(sessions, encrypter, refreshTokens, clock),
  },
  {
    provide: LogoutUseCase,
    inject: [SessionsRepository, RefreshTokenGenerator, Clock],
    useFactory: (
      sessions: SessionsRepository,
      refreshTokens: RefreshTokenGenerator,
      clock: Clock
    ) => new LogoutUseCase(sessions, refreshTokens, clock),
  },
  {
    provide: GetCurrentAccountUseCase,
    inject: [AccountsRepository],
    useFactory: (accounts: AccountsRepository) =>
      new GetCurrentAccountUseCase(accounts),
  },
  {
    provide: UpdateAccountUseCase,
    inject: [
      AccountsRepository,
      SessionsRepository,
      HashCompare,
      HashGenerator,
      Encrypter,
      RefreshTokenGenerator,
      Clock,
    ],
    useFactory: (
      accounts: AccountsRepository,
      sessions: SessionsRepository,
      hashCompare: HashCompare,
      hashGenerator: HashGenerator,
      encrypter: Encrypter,
      refreshTokens: RefreshTokenGenerator,
      clock: Clock
    ) =>
      new UpdateAccountUseCase(
        accounts,
        sessions,
        hashCompare,
        hashGenerator,
        encrypter,
        refreshTokens,
        clock
      ),
  },
]
