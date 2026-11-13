import { Provider } from '@nestjs/common'
import { EventBattles } from '@/domain/events/applications/services/event-battles'
import { GearRepository } from '@/domain/gear/applications/repositories/gear-repository'
import { BeastsRepository } from '@/domain/beasts/applications/repositories/beasts-repository'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { SkillOffersRepository } from '@/domain/characters/applications/repositories/skill-offers-repository'
import { Clock } from '@/core/gateways/clock'
import { SeedGenerator } from '@/domain/combat/applications/gateways/seed-generator'
import { BattleDraftsRepository } from '@/domain/combat/applications/repositories/battle-drafts-repository'
import { BattlesRepository } from '@/domain/combat/applications/repositories/battles-repository'
import { DraftPveBattleUseCase } from '@/domain/combat/applications/use-cases/draft-pve-battle'
import { ForfeitBattleUseCase } from '@/domain/combat/applications/use-cases/forfeit-battle'
import { FetchAccountBattlesUseCase } from '@/domain/combat/applications/use-cases/fetch-account-battles'
import { GetBattleUseCase } from '@/domain/combat/applications/use-cases/get-battle'
import { GetTurnOptionsUseCase } from '@/domain/combat/applications/use-cases/get-turn-options'
import { StartPveBattleUseCase } from '@/domain/combat/applications/use-cases/start-pve-battle'
import { SubmitBattleActionUseCase } from '@/domain/combat/applications/use-cases/submit-battle-action'
import { ChestsRepository } from '@/domain/economy/applications/repositories/chests-repository'
import { WalletsRepository } from '@/domain/economy/applications/repositories/wallets-repository'
import { SquadsRepository } from '@/domain/squads/applications/repositories/squads-repository'

export const battlesUseCases: Provider[] = [
  {
    provide: DraftPveBattleUseCase,
    inject: [
      AccountsRepository,
      CatalogRepository,
      BattleDraftsRepository,
      SeedGenerator,
      Clock,
    ],
    useFactory: (
      accounts: AccountsRepository,
      catalog: CatalogRepository,
      drafts: BattleDraftsRepository,
      seeds: SeedGenerator,
      clock: Clock
    ) => new DraftPveBattleUseCase(accounts, catalog, drafts, seeds, clock),
  },
  {
    provide: StartPveBattleUseCase,
    inject: [
      AccountsRepository,
      CharactersRepository,
      SquadsRepository,
      CatalogRepository,
      BattleDraftsRepository,
      BattlesRepository,
      SkillOffersRepository,
      WalletsRepository,
      ChestsRepository,
      GearRepository,
      BeastsRepository,
      EventBattles,
      Clock,
    ],
    useFactory: (
      accounts: AccountsRepository,
      characters: CharactersRepository,
      squads: SquadsRepository,
      catalog: CatalogRepository,
      drafts: BattleDraftsRepository,
      battles: BattlesRepository,
      offers: SkillOffersRepository,
      wallets: WalletsRepository,
      chests: ChestsRepository,
      gear: GearRepository,
      beasts: BeastsRepository,
      eventBattles: EventBattles,
      clock: Clock
    ) =>
      new StartPveBattleUseCase(
        accounts,
        characters,
        squads,
        catalog,
        drafts,
        battles,
        offers,
        wallets,
        chests,
        gear,
        beasts,
        eventBattles,
        clock
      ),
  },
  {
    provide: SubmitBattleActionUseCase,
    inject: [
      BattlesRepository,
      CharactersRepository,
      SkillOffersRepository,
      CatalogRepository,
      WalletsRepository,
      ChestsRepository,
      EventBattles,
      Clock,
    ],
    useFactory: (
      battles: BattlesRepository,
      characters: CharactersRepository,
      offers: SkillOffersRepository,
      catalog: CatalogRepository,
      wallets: WalletsRepository,
      chests: ChestsRepository,
      eventBattles: EventBattles,
      clock: Clock
    ) =>
      new SubmitBattleActionUseCase(
        battles,
        characters,
        offers,
        catalog,
        wallets,
        chests,
        eventBattles,
        clock
      ),
  },
  {
    provide: GetBattleUseCase,
    inject: [BattlesRepository],
    useFactory: (battles: BattlesRepository) => new GetBattleUseCase(battles),
  },
  {
    provide: ForfeitBattleUseCase,
    inject: [BattlesRepository, Clock],
    useFactory: (battles: BattlesRepository, clock: Clock) =>
      new ForfeitBattleUseCase(battles, clock),
  },
  {
    provide: FetchAccountBattlesUseCase,
    inject: [BattlesRepository],
    useFactory: (battles: BattlesRepository) =>
      new FetchAccountBattlesUseCase(battles),
  },
  {
    provide: GetTurnOptionsUseCase,
    inject: [BattlesRepository],
    useFactory: (battles: BattlesRepository) =>
      new GetTurnOptionsUseCase(battles),
  },
]
