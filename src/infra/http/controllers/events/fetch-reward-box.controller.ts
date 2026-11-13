import { Controller, Get } from '@nestjs/common'
import { FetchRewardBoxUseCase } from '@/domain/events/applications/use-cases/fetch-reward-box'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { PendingRewardPresenter } from '../../presenters/pending-reward-presenter'

/** GET /me/reward-box — a caixa de recompensas (D155): o que não coube no inventário, com a data limite. */
@Controller('me/reward-box')
export class FetchRewardBoxController {
  constructor(private fetchRewardBox: FetchRewardBoxUseCase) {}

  @Get()
  async handle(@CurrentUser() user: AccountPayload) {
    const result = await this.fetchRewardBox.execute({ accountId: user.sub })

    return { rewards: result.value.rewards.map(PendingRewardPresenter.toHTTP) }
  }
}
