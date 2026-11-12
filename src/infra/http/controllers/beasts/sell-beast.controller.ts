import { Controller, HttpCode, Param, Post } from '@nestjs/common'
import { SellBeastUseCase } from '@/domain/beasts/applications/use-cases/sell-beast'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { economyHttpError } from '../../economy-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { WalletPresenter } from '../../presenters/wallet-presenter'
import { uuidParamSchema } from '../../schemas/common'

/**
 * POST /beasts/:id/sell — vende ao sistema a besta sem contrato (o valor do grau, como o equipamento). A sagrada não
 * se vende.
 */
@Controller('beasts')
export class SellBeastController {
  constructor(private sellBeast: SellBeastUseCase) {}

  @Post(':id/sell')
  @HttpCode(200)
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) beastId: string,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.sellBeast.execute({
      accountId: user.sub,
      beastId,
    })

    if (result.isLeft()) throw economyHttpError(result.value)

    return {
      coins: result.value.coins,
      wallet: WalletPresenter.toHTTP(result.value.wallet),
    }
  }
}
