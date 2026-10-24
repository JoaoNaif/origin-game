import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { z } from 'zod'
import { StartPveBattleUseCase } from '@/domain/combat/applications/use-cases/start-pve-battle'
import { battleHttpError } from '../../battle-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { BattlePresenter } from '../../presenters/battle-presenter'

const startPveBattleBodySchema = z.object({
  draftId: z.string().uuid(),
  squadId: z.string().uuid(),
})

type StartPveBattleBodySchema = z.infer<typeof startPveBattleBodySchema>

/** POST /battles — começa a batalha da pré-batalha com o squad escolhido; a máquina joga até a vez do jogador. */
@Controller('battles')
export class StartPveBattleController {
  constructor(private startPveBattle: StartPveBattleUseCase) {}

  @Post()
  @HttpCode(201)
  async handle(
    @Body(new ZodValidationPipe(startPveBattleBodySchema))
    body: StartPveBattleBodySchema
  ) {
    const result = await this.startPveBattle.execute(body)

    if (result.isLeft()) throw battleHttpError(result.value)

    const { battle, engine, events, rewards } = result.value

    return {
      battle: BattlePresenter.toHTTP(battle, engine),
      events,
      rewards,
    }
  }
}
