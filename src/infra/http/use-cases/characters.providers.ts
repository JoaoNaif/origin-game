import { Provider } from '@nestjs/common'
import { Clock } from '@/core/gateways/clock'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { SkillOffersRepository } from '@/domain/characters/applications/repositories/skill-offers-repository'
import { ChooseSkillOfferUseCase } from '@/domain/characters/applications/use-cases/choose-skill-offer'
import { AllocateFreePointsUseCase } from '@/domain/characters/applications/use-cases/allocate-free-points'
import { EquipSkillsUseCase } from '@/domain/characters/applications/use-cases/equip-skills'
import { FetchAccountCharactersUseCase } from '@/domain/characters/applications/use-cases/fetch-account-characters'
import { FetchPendingSkillOffersUseCase } from '@/domain/characters/applications/use-cases/fetch-pending-skill-offers'
import { GetCharacterUseCase } from '@/domain/characters/applications/use-cases/get-character'
import { EnhanceSkillUseCase } from '@/domain/characters/applications/use-cases/enhance-skill'
import { SeedGenerator } from '@/domain/combat/applications/gateways/seed-generator'
import { WalletsRepository } from '@/domain/economy/applications/repositories/wallets-repository'

export const charactersUseCases: Provider[] = [
  {
    provide: FetchAccountCharactersUseCase,
    inject: [CharactersRepository],
    useFactory: (characters: CharactersRepository) =>
      new FetchAccountCharactersUseCase(characters),
  },
  {
    provide: GetCharacterUseCase,
    inject: [CharactersRepository],
    useFactory: (characters: CharactersRepository) =>
      new GetCharacterUseCase(characters),
  },
  {
    provide: EquipSkillsUseCase,
    inject: [CharactersRepository],
    useFactory: (characters: CharactersRepository) =>
      new EquipSkillsUseCase(characters),
  },
  {
    provide: AllocateFreePointsUseCase,
    inject: [CharactersRepository, CatalogRepository],
    useFactory: (
      characters: CharactersRepository,
      catalog: CatalogRepository
    ) => new AllocateFreePointsUseCase(characters, catalog),
  },
  {
    provide: FetchPendingSkillOffersUseCase,
    inject: [CharactersRepository, SkillOffersRepository],
    useFactory: (
      characters: CharactersRepository,
      offers: SkillOffersRepository
    ) => new FetchPendingSkillOffersUseCase(characters, offers),
  },
  {
    provide: ChooseSkillOfferUseCase,
    inject: [
      SkillOffersRepository,
      CharactersRepository,
      CatalogRepository,
      Clock,
    ],
    useFactory: (
      offers: SkillOffersRepository,
      characters: CharactersRepository,
      catalog: CatalogRepository,
      clock: Clock
    ) => new ChooseSkillOfferUseCase(offers, characters, catalog, clock),
  },
  {
    provide: EnhanceSkillUseCase,
    inject: [CharactersRepository, WalletsRepository, SeedGenerator],
    useFactory: (
      characters: CharactersRepository,
      wallets: WalletsRepository,
      seeds: SeedGenerator
    ) => new EnhanceSkillUseCase(characters, wallets, seeds),
  },
]
