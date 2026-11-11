import { Controller, HttpCode, Post } from '@nestjs/common'
import { BuyInventorySlotsUseCase } from '@/domain/economy/applications/use-cases/buy-inventory-slots'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { economyHttpError } from '../../economy-errors'
import { WalletPresenter } from '../../presenters/wallet-presenter'

/**
 * POST /me/inventory/expand — compra +5 espaços no inventário (D100): 300, 600, 1.000, 1.500, 2.000 M e +500 M a cada
 * compra seguinte, até 100 espaços.
 */
@Controller('me/inventory')
export class BuyInventorySlotsController {
  constructor(private buyInventorySlots: BuyInventorySlotsUseCase) {}

  @Post('expand')
  @HttpCode(200)
  async handle(@CurrentUser() user: AccountPayload) {
    const result = await this.buyInventorySlots.execute({
      accountId: user.sub,
    })

    if (result.isLeft()) throw economyHttpError(result.value)

    const { wallet, price } = result.value

    return {
      price,
      inventory: {
        slots: wallet.inventorySlots,
        nextExpansionPrice: wallet.nextInventoryExpansionPrice,
      },
      wallet: WalletPresenter.toHTTP(wallet),
    }
  }
}
