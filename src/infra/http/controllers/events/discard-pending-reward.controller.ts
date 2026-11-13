import { Controller, Delete, HttpCode, Param } from '@nestjs/common'
import { DiscardPendingRewardUseCase } from '@/domain/events/applications/use-cases/discard-pending-reward'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { economyHttpError } from '../../economy-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { uuidParamSchema } from '../../schemas/common'

/** DELETE /me/reward-box/:id — descarta o prêmio da caixa (some de vez, sem moeda). */
@Controller('me/reward-box')
export class DiscardPendingRewardController {
  constructor(private discardPendingReward: DiscardPendingRewardUseCase) {}

  @Delete(':id')
  @HttpCode(204)
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema))
    pendingRewardId: string,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.discardPendingReward.execute({
      accountId: user.sub,
      pendingRewardId,
    })

    if (result.isLeft()) throw economyHttpError(result.value)
  }
}
