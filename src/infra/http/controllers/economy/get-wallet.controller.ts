import { Controller, Get } from '@nestjs/common'
import { GetWalletUseCase } from '@/domain/economy/applications/use-cases/get-wallet'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { WalletPresenter } from '../../presenters/wallet-presenter'

/** GET /me/wallet — moeda e fragmentos da conta (D100, D104). */
@Controller('me/wallet')
export class GetWalletController {
  constructor(private getWallet: GetWalletUseCase) {}

  @Get()
  async handle(@CurrentUser() user: AccountPayload) {
    const result = await this.getWallet.execute({ accountId: user.sub })

    return { wallet: WalletPresenter.toHTTP(result.value.wallet) }
  }
}
