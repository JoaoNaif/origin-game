import { Controller, Get } from '@nestjs/common'
import { FetchAccountChestsUseCase } from '@/domain/economy/applications/use-cases/fetch-account-chests'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { ChestPresenter } from '../../presenters/chest-presenter'

/** GET /me/chests — os baús fechados da conta, do mais antigo para o mais novo. */
@Controller('me/chests')
export class FetchAccountChestsController {
  constructor(private fetchAccountChests: FetchAccountChestsUseCase) {}

  @Get()
  async handle(@CurrentUser() user: AccountPayload) {
    const result = await this.fetchAccountChests.execute({
      accountId: user.sub,
    })

    return { chests: result.value.chests.map(ChestPresenter.toHTTP) }
  }
}
