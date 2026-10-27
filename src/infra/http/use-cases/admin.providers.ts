import { Provider } from '@nestjs/common'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { FetchAccountsUseCase } from '@/domain/accounts/applications/use-cases/fetch-accounts'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CreateCatalogEntryUseCase } from '@/domain/catalog/applications/use-cases/create-catalog-entry'
import { DeleteCatalogEntryUseCase } from '@/domain/catalog/applications/use-cases/delete-catalog-entry'
import { UpdateCatalogEntryUseCase } from '@/domain/catalog/applications/use-cases/update-catalog-entry'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { FetchCharactersByUsernameUseCase } from '@/domain/characters/applications/use-cases/fetch-characters-by-username'
import { GrantCharacterUseCase } from '@/domain/characters/applications/use-cases/grant-character'
import { BattlesRepository } from '@/domain/combat/applications/repositories/battles-repository'
import { FetchBattlesByUsernameUseCase } from '@/domain/combat/applications/use-cases/fetch-battles-by-username'

/** Casos de uso das rotas de admin (`/admin/...`): catálogo e contas. */
export const adminUseCases: Provider[] = [
  {
    provide: CreateCatalogEntryUseCase,
    inject: [CatalogRepository],
    useFactory: (catalog: CatalogRepository) =>
      new CreateCatalogEntryUseCase(catalog),
  },
  {
    provide: UpdateCatalogEntryUseCase,
    inject: [CatalogRepository],
    useFactory: (catalog: CatalogRepository) =>
      new UpdateCatalogEntryUseCase(catalog),
  },
  {
    provide: DeleteCatalogEntryUseCase,
    inject: [CatalogRepository],
    useFactory: (catalog: CatalogRepository) =>
      new DeleteCatalogEntryUseCase(catalog),
  },
  {
    provide: FetchAccountsUseCase,
    inject: [AccountsRepository],
    useFactory: (accounts: AccountsRepository) =>
      new FetchAccountsUseCase(accounts),
  },
  {
    provide: FetchCharactersByUsernameUseCase,
    inject: [AccountsRepository, CharactersRepository],
    useFactory: (
      accounts: AccountsRepository,
      characters: CharactersRepository
    ) => new FetchCharactersByUsernameUseCase(accounts, characters),
  },
  {
    provide: FetchBattlesByUsernameUseCase,
    inject: [AccountsRepository, BattlesRepository],
    useFactory: (accounts: AccountsRepository, battles: BattlesRepository) =>
      new FetchBattlesByUsernameUseCase(accounts, battles),
  },
  {
    provide: GrantCharacterUseCase,
    inject: [AccountsRepository, CharactersRepository, CatalogRepository],
    useFactory: (
      accounts: AccountsRepository,
      characters: CharactersRepository,
      catalog: CatalogRepository
    ) => new GrantCharacterUseCase(accounts, characters, catalog),
  },
]
