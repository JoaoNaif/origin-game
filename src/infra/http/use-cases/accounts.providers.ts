import { Provider } from '@nestjs/common'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { CreateAccountUseCase } from '@/domain/accounts/applications/use-cases/create-account'
import { FetchAccountByUsernameUseCase } from '@/domain/accounts/applications/use-cases/fetch-account-by-username'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'

// O domain não tem decorators, então cada use-case é montado por factory com
// os ports resolvidos pelo Nest. A própria classe do use-case é o token de DI.
export const accountsUseCases: Provider[] = [
  {
    provide: CreateAccountUseCase,
    inject: [AccountsRepository, CharactersRepository, CatalogRepository],
    useFactory: (
      accounts: AccountsRepository,
      characters: CharactersRepository,
      catalog: CatalogRepository
    ) => new CreateAccountUseCase(accounts, characters, catalog),
  },
  {
    provide: FetchAccountByUsernameUseCase,
    inject: [AccountsRepository],
    useFactory: (accounts: AccountsRepository) =>
      new FetchAccountByUsernameUseCase(accounts),
  },
]
