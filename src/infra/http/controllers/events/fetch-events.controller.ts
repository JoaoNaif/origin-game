import { Controller, Get } from '@nestjs/common'
import { FetchEventsUseCase } from '@/domain/events/applications/use-cases/fetch-events'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { EventPresenter } from '../../presenters/event-presenter'

/**
 * GET /events — os eventos que o jogador vê (D155): abertos, anunciados ("começa em...") e os encerrados em que ele
 * jogou, cada um com o progresso da conta.
 */
@Controller('events')
export class FetchEventsController {
  constructor(private fetchEvents: FetchEventsUseCase) {}

  @Get()
  async handle(@CurrentUser() user: AccountPayload) {
    const result = await this.fetchEvents.execute({ accountId: user.sub })
    const { events, catalog, now } = result.value

    return {
      events: events.map(({ event, entry }) =>
        EventPresenter.toHTTP(event, entry, catalog, now)
      ),
      serverTime: now,
    }
  }
}
