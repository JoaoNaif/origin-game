import { Controller, HttpCode, Param, Post } from '@nestjs/common'
import { ClaimPendingRewardUseCase } from '@/domain/events/applications/use-cases/claim-pending-reward'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { economyHttpError } from '../../economy-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { uuidParamSchema } from '../../schemas/common'

/** POST /me/reward-box/:id/claim — retira o prêmio da caixa (precisa de espaço no inventário e estar no prazo). */
@Controller('me/reward-box')
export class ClaimPendingRewardController {
  constructor(private claimPendingReward: ClaimPendingRewardUseCase) {}

  @Post(':id/claim')
  @HttpCode(200)
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema))
    pendingRewardId: string,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.claimPendingReward.execute({
      accountId: user.sub,
      pendingRewardId,
    })

    if (result.isLeft()) throw economyHttpError(result.value)

    return { granted: result.value.granted }
  }
}
