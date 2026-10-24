import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common'
import { z } from 'zod'
import { SubmitBattleActionUseCase } from '@/domain/combat/applications/use-cases/submit-battle-action'
import { battleHttpError } from '../../battle-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { BattlePresenter } from '../../presenters/battle-presenter'
import { battleActionSchema } from '../../schemas/battle-action'
import { uuidParamSchema } from '../../schemas/common'

type BattleActionBodySchema = z.infer<typeof battleActionSchema>

/** POST /battles/:id/actions — a jogada do jogador na vez dele; devolve o que ela e a máquina fizeram depois. */
@Controller('battles')
export class SubmitBattleActionController {
  constructor(private submitBattleAction: SubmitBattleActionUseCase) {}

  @Post(':id/actions')
  @HttpCode(200)
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) battleId: string,
    @Body(new ZodValidationPipe(battleActionSchema))
    payload: BattleActionBodySchema
  ) {
    const result = await this.submitBattleAction.execute({ battleId, payload })

    if (result.isLeft()) throw battleHttpError(result.value)

    const { battle, engine, events, rewards } = result.value

    return {
      battle: BattlePresenter.toHTTP(battle, engine),
      events,
      rewards,
    }
  }
}
