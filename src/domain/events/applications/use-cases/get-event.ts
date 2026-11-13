import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Clock } from '@/core/gateways/clock'
import {
  CatalogRepository,
  GameCatalog,
} from '@/domain/catalog/applications/repositories/catalog-repository'
import { EventEntry } from '../../entities/event-entry'
import { EventTemplate } from '../../entities/event-template'
import { EventPhase } from '../../enums/event-phase'
import { EventEntriesRepository } from '../repositories/event-entries-repository'

interface GetEventUseCaseRequest {
  accountId: string
  eventKey: string
}

type GetEventUseCaseResponse = Either<
  ResourceNotFoundError,
  {
    event: EventTemplate
    entry: EventEntry | null
    catalog: GameCatalog
    now: Date
  }
>

/** Um evento com o progresso da conta (D155). Antes do anúncio, não existe para o jogador. */
export class GetEventUseCase {
  constructor(
    private catalogRepository: CatalogRepository,
    private eventEntriesRepository: EventEntriesRepository,
    private clock: Clock
  ) {}

  async execute({
    accountId,
    eventKey,
  }: GetEventUseCaseRequest): Promise<GetEventUseCaseResponse> {
    const catalog = await this.catalogRepository.load()
    const now = this.clock.now()
    const event = [...catalog.events.values()].find((e) => e.key === eventKey)
    if (!event || event.phaseAt(now) === EventPhase.HIDDEN) {
      return left(new ResourceNotFoundError('evento'))
    }

    const entry = await this.eventEntriesRepository.findByAccountAndEvent(
      accountId,
      event.id.toString()
    )

    return right({ event, entry, catalog, now })
  }
}
