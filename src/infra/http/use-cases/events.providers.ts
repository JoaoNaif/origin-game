import { Provider } from '@nestjs/common'
import { Clock } from '@/core/gateways/clock'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { BeastsRepository } from '@/domain/beasts/applications/repositories/beasts-repository'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { SeedGenerator } from '@/domain/combat/applications/gateways/seed-generator'
import { BattleDraftsRepository } from '@/domain/combat/applications/repositories/battle-drafts-repository'
import { BattlesRepository } from '@/domain/combat/applications/repositories/battles-repository'
import { ChestsRepository } from '@/domain/economy/applications/repositories/chests-repository'
import { WalletsRepository } from '@/domain/economy/applications/repositories/wallets-repository'
import { EventEntriesRepository } from '@/domain/events/applications/repositories/event-entries-repository'
import { PendingRewardsRepository } from '@/domain/events/applications/repositories/pending-rewards-repository'
import { EventBattles } from '@/domain/events/applications/services/event-battles'
import { EventRewardsDeps } from '@/domain/events/applications/services/grant-event-rewards'
import { ClaimPendingRewardUseCase } from '@/domain/events/applications/use-cases/claim-pending-reward'
import { DiscardPendingRewardUseCase } from '@/domain/events/applications/use-cases/discard-pending-reward'
import { DraftEventBattleUseCase } from '@/domain/events/applications/use-cases/draft-event-battle'
import { FetchEventsUseCase } from '@/domain/events/applications/use-cases/fetch-events'
import { FetchRewardBoxUseCase } from '@/domain/events/applications/use-cases/fetch-reward-box'
import { GetEventUseCase } from '@/domain/events/applications/use-cases/get-event'
import { GearRepository } from '@/domain/gear/applications/repositories/gear-repository'

/** Os repositórios que a entrega dos prêmios do evento usa (token próprio para injetar junto). */
const EVENT_REWARDS_DEPS = 'EVENT_REWARDS_DEPS'

/**
 * Eventos (D155): o serviço das batalhas de evento (também injetado no início e na jogada da batalha), a lista, a
 * pré-batalha e a caixa de recompensas.
 */
export const eventsUseCases: Provider[] = [
  {
    provide: EVENT_REWARDS_DEPS,
    inject: [
      CharactersRepository,
      WalletsRepository,
      ChestsRepository,
      GearRepository,
      BeastsRepository,
      PendingRewardsRepository,
    ],
    useFactory: (
      characters: CharactersRepository,
      wallets: WalletsRepository,
      chests: ChestsRepository,
      gear: GearRepository,
      beasts: BeastsRepository,
      pending: PendingRewardsRepository
    ): EventRewardsDeps => ({
      charactersRepository: characters,
      walletsRepository: wallets,
      chestsRepository: chests,
      gearRepository: gear,
      beastsRepository: beasts,
      pendingRewardsRepository: pending,
    }),
  },
  {
    provide: EventBattles,
    inject: [
      EventEntriesRepository,
      AccountsRepository,
      BattlesRepository,
      EVENT_REWARDS_DEPS,
    ],
    useFactory: (
      entries: EventEntriesRepository,
      accounts: AccountsRepository,
      battles: BattlesRepository,
      deps: EventRewardsDeps
    ) => new EventBattles(entries, accounts, battles, deps),
  },
  {
    provide: FetchEventsUseCase,
    inject: [CatalogRepository, EventEntriesRepository, Clock],
    useFactory: (
      catalog: CatalogRepository,
      entries: EventEntriesRepository,
      clock: Clock
    ) => new FetchEventsUseCase(catalog, entries, clock),
  },
  {
    provide: GetEventUseCase,
    inject: [CatalogRepository, EventEntriesRepository, Clock],
    useFactory: (
      catalog: CatalogRepository,
      entries: EventEntriesRepository,
      clock: Clock
    ) => new GetEventUseCase(catalog, entries, clock),
  },
  {
    provide: DraftEventBattleUseCase,
    inject: [
      AccountsRepository,
      CatalogRepository,
      BattleDraftsRepository,
      EventBattles,
      SeedGenerator,
      Clock,
    ],
    useFactory: (
      accounts: AccountsRepository,
      catalog: CatalogRepository,
      drafts: BattleDraftsRepository,
      eventBattles: EventBattles,
      seeds: SeedGenerator,
      clock: Clock
    ) =>
      new DraftEventBattleUseCase(
        accounts,
        catalog,
        drafts,
        eventBattles,
        seeds,
        clock
      ),
  },
  {
    provide: FetchRewardBoxUseCase,
    inject: [PendingRewardsRepository, Clock],
    useFactory: (pending: PendingRewardsRepository, clock: Clock) =>
      new FetchRewardBoxUseCase(pending, clock),
  },
  {
    provide: ClaimPendingRewardUseCase,
    inject: [
      PendingRewardsRepository,
      AccountsRepository,
      CatalogRepository,
      EVENT_REWARDS_DEPS,
      Clock,
    ],
    useFactory: (
      pending: PendingRewardsRepository,
      accounts: AccountsRepository,
      catalog: CatalogRepository,
      deps: EventRewardsDeps,
      clock: Clock
    ) => new ClaimPendingRewardUseCase(pending, accounts, catalog, deps, clock),
  },
  {
    provide: DiscardPendingRewardUseCase,
    inject: [PendingRewardsRepository],
    useFactory: (pending: PendingRewardsRepository) =>
      new DiscardPendingRewardUseCase(pending),
  },
]
