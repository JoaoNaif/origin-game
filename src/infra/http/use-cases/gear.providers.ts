import { Provider } from '@nestjs/common'
import { Clock } from '@/core/gateways/clock'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { WalletsRepository } from '@/domain/economy/applications/repositories/wallets-repository'
import { GearRepository } from '@/domain/gear/applications/repositories/gear-repository'
import { EquipGearUseCase } from '@/domain/gear/applications/use-cases/equip-gear'
import { FetchAccountGearUseCase } from '@/domain/gear/applications/use-cases/fetch-account-gear'
import { FetchGearBondsUseCase } from '@/domain/gear/applications/use-cases/fetch-gear-bonds'
import { GrantGearUseCase } from '@/domain/gear/applications/use-cases/grant-gear'
import { SellGearUseCase } from '@/domain/gear/applications/use-cases/sell-gear'
import { UnequipGearUseCase } from '@/domain/gear/applications/use-cases/unequip-gear'

/** Casos de uso do equipamento vivo (D153): inventário, equipar, vender e o admin dar. */
export const gearUseCases: Provider[] = [
  {
    provide: FetchAccountGearUseCase,
    inject: [GearRepository, CharactersRepository, WalletsRepository],
    useFactory: (
      gear: GearRepository,
      characters: CharactersRepository,
      wallets: WalletsRepository
    ) => new FetchAccountGearUseCase(gear, characters, wallets),
  },
  {
    provide: FetchGearBondsUseCase,
    inject: [GearRepository, CharactersRepository, CatalogRepository],
    useFactory: (
      gear: GearRepository,
      characters: CharactersRepository,
      catalog: CatalogRepository
    ) => new FetchGearBondsUseCase(gear, characters, catalog),
  },
  {
    provide: EquipGearUseCase,
    inject: [GearRepository, CharactersRepository],
    useFactory: (gear: GearRepository, characters: CharactersRepository) =>
      new EquipGearUseCase(gear, characters),
  },
  {
    provide: UnequipGearUseCase,
    inject: [GearRepository],
    useFactory: (gear: GearRepository) => new UnequipGearUseCase(gear),
  },
  {
    provide: SellGearUseCase,
    inject: [GearRepository, WalletsRepository, CatalogRepository],
    useFactory: (
      gear: GearRepository,
      wallets: WalletsRepository,
      catalog: CatalogRepository
    ) => new SellGearUseCase(gear, wallets, catalog),
  },
  {
    provide: GrantGearUseCase,
    inject: [
      AccountsRepository,
      GearRepository,
      WalletsRepository,
      CatalogRepository,
      Clock,
    ],
    useFactory: (
      accounts: AccountsRepository,
      gear: GearRepository,
      wallets: WalletsRepository,
      catalog: CatalogRepository,
      clock: Clock
    ) => new GrantGearUseCase(accounts, gear, wallets, catalog, clock),
  },
]
