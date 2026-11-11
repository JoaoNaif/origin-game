import { Controller, HttpCode, Param, Post } from '@nestjs/common'
import { SellGearUseCase } from '@/domain/gear/applications/use-cases/sell-gear'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { economyHttpError } from '../../economy-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { WalletPresenter } from '../../presenters/wallet-presenter'
import { uuidParamSchema } from '../../schemas/common'

/**
 * POST /gear/:id/sell — vende o equipamento ao sistema (Escudeiro 40, Cavaleiro 250, Mestre 1.500, Rei 9.000 M). O
 * Divino não se vende; equipado, tire antes.
 */
@Controller('gear')
export class SellGearController {
  constructor(private sellGear: SellGearUseCase) {}

  @Post(':id/sell')
  @HttpCode(200)
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) gearId: string,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.sellGear.execute({
      accountId: user.sub,
      gearId,
    })

    if (result.isLeft()) throw economyHttpError(result.value)

    return {
      coins: result.value.coins,
      wallet: WalletPresenter.toHTTP(result.value.wallet),
    }
  }
}
