import { Controller, HttpCode, Param, Post } from '@nestjs/common'
import { ForfeitBattleUseCase } from '@/domain/combat/applications/use-cases/forfeit-battle'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { battleHttpError } from '../../battle-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { BattlePresenter } from '../../presenters/battle-presenter'
import { uuidParamSchema } from '../../schemas/common'

/** POST /battles/:id/forfeit — desistir (W.O.): a máquina vence, sem XP (D136, a confirmar). */
@Controller('battles')
export class ForfeitBattleController {
  constructor(private forfeitBattle: ForfeitBattleUseCase) {}

  @Post(':id/forfeit')
  @HttpCode(200)
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) battleId: string,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.forfeitBattle.execute({
      battleId,
      accountId: user.sub,
    })

    if (result.isLeft()) throw battleHttpError(result.value)

    return {
      battle: BattlePresenter.toHTTP(result.value.battle, result.value.engine),
    }
  }
}
