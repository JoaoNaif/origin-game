import { Controller, Get, NotFoundException, Param } from '@nestjs/common'
import { GetEventUseCase } from '@/domain/events/applications/use-cases/get-event'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { EventPresenter } from '../../presenters/event-presenter'
import { catalogKeySchema } from '../../schemas/catalog'

/** GET /events/:key — um evento com o progresso da conta (D155); 404 antes do anúncio. */
@Controller('events')
export class GetEventController {
  constructor(private getEvent: GetEventUseCase) {}

  @Get(':key')
  async handle(
    @Param('key', new ZodValidationPipe(catalogKeySchema)) eventKey: string,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.getEvent.execute({
      accountId: user.sub,
      eventKey,
    })

    if (result.isLeft()) throw new NotFoundException(result.value.message)

    const { event, entry, catalog, now } = result.value

    return {
      event: EventPresenter.toHTTP(event, entry, catalog, now),
      serverTime: now,
    }
  }
}
