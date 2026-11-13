import { Either, right } from '@/core/either'
import { Clock } from '@/core/gateways/clock'
import {
  CatalogRepository,
  GameCatalog,
} from '@/domain/catalog/applications/repositories/catalog-repository'
import { EventEntry } from '../../entities/event-entry'
import { EventTemplate } from '../../entities/event-template'
import { EventPhase } from '../../enums/event-phase'
import { EventEntriesRepository } from '../repositories/event-entries-repository'

interface FetchEventsUseCaseRequest {
  accountId: string
}

type FetchEventsUseCaseResponse = Either<
  never,
  {
    events: { event: EventTemplate; entry: EventEntry | null }[]
    catalog: GameCatalog
    now: Date
  }
>

/** Ordem na lista: abertos, depois anunciados, depois encerrados. */
const PHASE_ORDER: Record<EventPhase, number> = {
  OPEN: 0,
  ANNOUNCED: 1,
  ENDED: 2,
  HIDDEN: 3,
}

/**
 * Os eventos que o jogador vê (D155): anunciados, abertos e os encerrados em que ele jogou (para rever o resultado),
 * cada um com o progresso da conta. Os que ainda não foram anunciados ficam de fora.
 */
export class FetchEventsUseCase {
  constructor(
    private catalogRepository: CatalogRepository,
    private eventEntriesRepository: EventEntriesRepository,
    private clock: Clock
  ) {}

  async execute({
    accountId,
  }: FetchEventsUseCaseRequest): Promise<FetchEventsUseCaseResponse> {
    const [catalog, entries] = await Promise.all([
      this.catalogRepository.load(),
      this.eventEntriesRepository.findManyByAccountId(accountId),
    ])
    const now = this.clock.now()
    const entryOf = (event: EventTemplate) =>
      entries.find((e) => e.eventId.equals(event.id)) ?? null

    const events = [...catalog.events.values()]
      .map((event) => ({
        event,
        entry: entryOf(event),
        phase: event.phaseAt(now),
      }))
      .filter(
        ({ phase, entry }) =>
          phase === EventPhase.OPEN ||
          phase === EventPhase.ANNOUNCED ||
          (phase === EventPhase.ENDED && entry !== null)
      )
      .sort(
        (a, b) =>
          PHASE_ORDER[a.phase] - PHASE_ORDER[b.phase] ||
          a.event.endsAt.getTime() - b.event.endsAt.getTime()
      )
      .map(({ event, entry }) => ({ event, entry }))

    return right({ events, catalog, now })
  }
}
