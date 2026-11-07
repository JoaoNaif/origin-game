import { Provider } from '@nestjs/common'
import { Clock } from '@/core/gateways/clock'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { SeedGenerator } from '@/domain/combat/applications/gateways/seed-generator'
import { ChestsRepository } from '@/domain/economy/applications/repositories/chests-repository'
import { WalletsRepository } from '@/domain/economy/applications/repositories/wallets-repository'
import { BuyChestUseCase } from '@/domain/economy/applications/use-cases/buy-chest'
import { BuyFragmentsUseCase } from '@/domain/economy/applications/use-cases/buy-fragments'
import { FetchAccountChestsUseCase } from '@/domain/economy/applications/use-cases/fetch-account-chests'
import { GetWalletUseCase } from '@/domain/economy/applications/use-cases/get-wallet'
import { OpenChestUseCase } from '@/domain/economy/applications/use-cases/open-chest'
import { SellFragmentsUseCase } from '@/domain/economy/applications/use-cases/sell-fragments'

export const economyUseCases: Provider[] = [
  {
    provide: GetWalletUseCase,
    inject: [WalletsRepository],
    useFactory: (wallets: WalletsRepository) => new GetWalletUseCase(wallets),
  },
  {
    provide: BuyFragmentsUseCase,
    inject: [WalletsRepository],
    useFactory: (wallets: WalletsRepository) =>
      new BuyFragmentsUseCase(wallets),
  },
  {
    provide: SellFragmentsUseCase,
    inject: [WalletsRepository],
    useFactory: (wallets: WalletsRepository) =>
      new SellFragmentsUseCase(wallets),
  },
  {
    provide: BuyChestUseCase,
    inject: [WalletsRepository, ChestsRepository, Clock],
    useFactory: (
      wallets: WalletsRepository,
      chests: ChestsRepository,
      clock: Clock
    ) => new BuyChestUseCase(wallets, chests, clock),
  },
  {
    provide: FetchAccountChestsUseCase,
    inject: [ChestsRepository],
    useFactory: (chests: ChestsRepository) =>
      new FetchAccountChestsUseCase(chests),
  },
  {
    provide: OpenChestUseCase,
    inject: [
      ChestsRepository,
      WalletsRepository,
      CharactersRepository,
      AccountsRepository,
      CatalogRepository,
      SeedGenerator,
      Clock,
    ],
    useFactory: (
      chests: ChestsRepository,
      wallets: WalletsRepository,
      characters: CharactersRepository,
      accounts: AccountsRepository,
      catalog: CatalogRepository,
      seeds: SeedGenerator,
      clock: Clock
    ) =>
      new OpenChestUseCase(
        chests,
        wallets,
        characters,
        accounts,
        catalog,
        seeds,
        clock
      ),
  },
]
