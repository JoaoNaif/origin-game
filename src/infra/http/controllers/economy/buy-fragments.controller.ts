import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { BuyFragmentsUseCase } from '@/domain/economy/applications/use-cases/buy-fragments'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { economyHttpError } from '../../economy-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { WalletPresenter } from '../../presenters/wallet-presenter'
import {
  fragmentTradeBodySchema,
  FragmentTradeBodySchema,
} from '../../schemas/fragments'

/** POST /me/fragments/buy — compra fragmentos do sistema (200 M cada, até 500 no tipo). */
@Controller('me/fragments')
export class BuyFragmentsController {
  constructor(private buyFragments: BuyFragmentsUseCase) {}

  @Post('buy')
  @HttpCode(200)
  async handle(
    @Body(new ZodValidationPipe(fragmentTradeBodySchema))
    body: FragmentTradeBodySchema,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.buyFragments.execute({
      accountId: user.sub,
      ...body,
    })

    if (result.isLeft()) throw economyHttpError(result.value)

    return { wallet: WalletPresenter.toHTTP(result.value.wallet) }
  }
}
