import { Controller, Get, Param } from '@nestjs/common'
import { GetTurnOptionsUseCase } from '@/domain/combat/applications/use-cases/get-turn-options'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { battleHttpError } from '../../battle-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { TurnOptionsPresenter } from '../../presenters/turn-options-presenter'
import { uuidParamSchema } from '../../schemas/common'

/** GET /battles/:id/options — as jogadas legais da vez do jogador, com a prévia de cada skill. */
@Controller('battles')
export class GetTurnOptionsController {
  constructor(private getTurnOptions: GetTurnOptionsUseCase) {}

  @Get(':id/options')
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) battleId: string,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.getTurnOptions.execute({
      battleId,
      accountId: user.sub,
    })

    if (result.isLeft()) throw battleHttpError(result.value)

    return TurnOptionsPresenter.toHTTP(result.value.turn, result.value.options)
  }
}
