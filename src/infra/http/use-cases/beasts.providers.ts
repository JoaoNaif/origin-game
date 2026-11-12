import { Provider } from '@nestjs/common'
import { Clock } from '@/core/gateways/clock'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { BeastsRepository } from '@/domain/beasts/applications/repositories/beasts-repository'
import { ContractBeastUseCase } from '@/domain/beasts/applications/use-cases/contract-beast'
import { FetchAccountBeastsUseCase } from '@/domain/beasts/applications/use-cases/fetch-account-beasts'
import { FetchBeastRequirementsUseCase } from '@/domain/beasts/applications/use-cases/fetch-beast-requirements'
import { GrantBeastUseCase } from '@/domain/beasts/applications/use-cases/grant-beast'
import { MoveBeastSlotUseCase } from '@/domain/beasts/applications/use-cases/move-beast-slot'
import { ReleaseBeastUseCase } from '@/domain/beasts/applications/use-cases/release-beast'
import { SellBeastUseCase } from '@/domain/beasts/applications/use-cases/sell-beast'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { WalletsRepository } from '@/domain/economy/applications/repositories/wallets-repository'
import { GearRepository } from '@/domain/gear/applications/repositories/gear-repository'

/** Casos de uso dos contratos com bestas (D154): inventário, firmar, trocar o slot, desfazer, vender e o admin dar. */
export const beastsUseCases: Provider[] = [
  {
    provide: FetchAccountBeastsUseCase,
    inject: [BeastsRepository, CharactersRepository],
    useFactory: (beasts: BeastsRepository, characters: CharactersRepository) =>
      new FetchAccountBeastsUseCase(beasts, characters),
  },
  {
    provide: FetchBeastRequirementsUseCase,
    inject: [BeastsRepository, CharactersRepository, CatalogRepository],
    useFactory: (
      beasts: BeastsRepository,
      characters: CharactersRepository,
      catalog: CatalogRepository
    ) => new FetchBeastRequirementsUseCase(beasts, characters, catalog),
  },
  {
    provide: ContractBeastUseCase,
    inject: [BeastsRepository, CharactersRepository, CatalogRepository],
    useFactory: (
      beasts: BeastsRepository,
      characters: CharactersRepository,
      catalog: CatalogRepository
    ) => new ContractBeastUseCase(beasts, characters, catalog),
  },
  {
    provide: MoveBeastSlotUseCase,
    inject: [BeastsRepository],
    useFactory: (beasts: BeastsRepository) => new MoveBeastSlotUseCase(beasts),
  },
  {
    provide: ReleaseBeastUseCase,
    inject: [BeastsRepository],
    useFactory: (beasts: BeastsRepository) => new ReleaseBeastUseCase(beasts),
  },
  {
    provide: SellBeastUseCase,
    inject: [BeastsRepository, WalletsRepository, CatalogRepository],
    useFactory: (
      beasts: BeastsRepository,
      wallets: WalletsRepository,
      catalog: CatalogRepository
    ) => new SellBeastUseCase(beasts, wallets, catalog),
  },
  {
    provide: GrantBeastUseCase,
    inject: [
      AccountsRepository,
      BeastsRepository,
      GearRepository,
      WalletsRepository,
      CatalogRepository,
      Clock,
    ],
    useFactory: (
      accounts: AccountsRepository,
      beasts: BeastsRepository,
      gear: GearRepository,
      wallets: WalletsRepository,
      catalog: CatalogRepository,
      clock: Clock
    ) => new GrantBeastUseCase(accounts, beasts, gear, wallets, catalog, clock),
  },
]
