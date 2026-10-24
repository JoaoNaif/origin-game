import { Controller, Get, Param } from '@nestjs/common'
import { GetBattleUseCase } from '@/domain/combat/applications/use-cases/get-battle'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { battleHttpError } from '../../battle-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { BattlePresenter } from '../../presenters/battle-presenter'
import { uuidParamSchema } from '../../schemas/common'

/** GET /battles/:id — o estado atual e todos os eventos (para retomar a tela ou rever a batalha). */
@Controller('battles')
export class GetBattleController {
  constructor(private getBattle: GetBattleUseCase) {}

  @Get(':id')
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) battleId: string,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.getBattle.execute({
      battleId,
      accountId: user.sub,
    })

    if (result.isLeft()) throw battleHttpError(result.value)

    const { battle, engine } = result.value

    return {
      battle: BattlePresenter.toHTTP(battle, engine),
      events: engine.events,
    }
  }
}
