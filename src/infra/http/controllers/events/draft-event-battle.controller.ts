import { Controller, HttpCode, Param, Post } from '@nestjs/common'
import { DraftEventBattleUseCase } from '@/domain/events/applications/use-cases/draft-event-battle'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { battleHttpError } from '../../battle-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { catalogKeySchema } from '../../schemas/catalog'

/**
 * POST /events/:key/draft — pré-batalha da próxima etapa do evento (D155): o adversário da etapa e o campo (fixo do
 * evento ou sorteado). A batalha começa no `POST /battles` de sempre, com o `draftId` e o squad.
 */
@Controller('events')
export class DraftEventBattleController {
  constructor(private draftEventBattle: DraftEventBattleUseCase) {}

  @Post(':key/draft')
  @HttpCode(201)
  async handle(
    @Param('key', new ZodValidationPipe(catalogKeySchema)) eventKey: string,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.draftEventBattle.execute({
      accountId: user.sub,
      eventKey,
    })

    if (result.isLeft()) throw battleHttpError(result.value)

    const { draft, event, stage, npcSquad, field } = result.value

    // a seed fica no servidor (D33)
    return {
      draft: {
        id: draft.id.toString(),
        event: {
          key: event.key,
          name: event.name,
          stage,
          stageName: event.stages[stage].name,
          squadMode: event.squadMode,
          modifiers: event.modifiers,
        },
        opponent: {
          key: npcSquad.key,
          name: npcSquad.name,
          profile: npcSquad.profile,
          difficulty: npcSquad.difficulty,
        },
        field,
      },
    }
  }
}
