import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { SellFragmentsUseCase } from '@/domain/economy/applications/use-cases/sell-fragments'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { economyHttpError } from '../../economy-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { WalletPresenter } from '../../presenters/wallet-presenter'
import {
  fragmentTradeBodySchema,
  FragmentTradeBodySchema,
} from '../../schemas/fragments'

/** POST /me/fragments/sell — vende fragmentos ao sistema (40 M cada). */
@Controller('me/fragments')
export class SellFragmentsController {
  constructor(private sellFragments: SellFragmentsUseCase) {}

  @Post('sell')
  @HttpCode(200)
  async handle(
    @Body(new ZodValidationPipe(fragmentTradeBodySchema))
    body: FragmentTradeBodySchema,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.sellFragments.execute({
      accountId: user.sub,
      ...body,
    })

    if (result.isLeft()) throw economyHttpError(result.value)

    return { wallet: WalletPresenter.toHTTP(result.value.wallet) }
  }
}
