import { Provider } from '@nestjs/common'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { Clock } from '@/core/gateways/clock'
import { SeedGenerator } from '@/domain/combat/applications/gateways/seed-generator'
import { BattleDraftsRepository } from '@/domain/combat/applications/repositories/battle-drafts-repository'
import { BattlesRepository } from '@/domain/combat/applications/repositories/battles-repository'
import { DraftPveBattleUseCase } from '@/domain/combat/applications/use-cases/draft-pve-battle'
import { GetBattleUseCase } from '@/domain/combat/applications/use-cases/get-battle'
import { GetTurnOptionsUseCase } from '@/domain/combat/applications/use-cases/get-turn-options'
import { StartPveBattleUseCase } from '@/domain/combat/applications/use-cases/start-pve-battle'
import { SubmitBattleActionUseCase } from '@/domain/combat/applications/use-cases/submit-battle-action'
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
      Clock,
    ],
    useFactory: (
      accounts: AccountsRepository,
      characters: CharactersRepository,
      squads: SquadsRepository,
      catalog: CatalogRepository,
      drafts: BattleDraftsRepository,
      battles: BattlesRepository,
      clock: Clock
    ) =>
      new StartPveBattleUseCase(
        accounts,
        characters,
        squads,
        catalog,
        drafts,
        battles,
        clock
      ),
  },
  {
    provide: SubmitBattleActionUseCase,
    inject: [BattlesRepository, CharactersRepository, Clock],
    useFactory: (
      battles: BattlesRepository,
      characters: CharactersRepository,
      clock: Clock
    ) => new SubmitBattleActionUseCase(battles, characters, clock),
  },
  {
    provide: GetBattleUseCase,
    inject: [BattlesRepository],
    useFactory: (battles: BattlesRepository) => new GetBattleUseCase(battles),
  },
  {
    provide: GetTurnOptionsUseCase,
    inject: [BattlesRepository],
    useFactory: (battles: BattlesRepository) =>
      new GetTurnOptionsUseCase(battles),
  },
]
