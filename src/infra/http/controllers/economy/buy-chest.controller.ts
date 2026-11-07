import { Body, Controller, Post } from '@nestjs/common'
import { z } from 'zod'
import { Rarity } from '@/domain/characters/enums/rarity'
import { BuyChestUseCase } from '@/domain/economy/applications/use-cases/buy-chest'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { economyHttpError } from '../../economy-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { ChestPresenter } from '../../presenters/chest-presenter'
import { WalletPresenter } from '../../presenters/wallet-presenter'

const buyChestBodySchema = z.object({
  tier: z.nativeEnum(Rarity),
})

type BuyChestBodySchema = z.infer<typeof buyChestBodySchema>

/** POST /me/chests — compra um baú com moeda (E 300, D 1.000, C 3.500 M). Chega fechado: abrir em /chests/:id/open. */
@Controller('me/chests')
export class BuyChestController {
  constructor(private buyChest: BuyChestUseCase) {}

  @Post()
  async handle(
    @Body(new ZodValidationPipe(buyChestBodySchema)) body: BuyChestBodySchema,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.buyChest.execute({
      accountId: user.sub,
      tier: body.tier,
    })

    if (result.isLeft()) throw economyHttpError(result.value)

    return {
      chest: ChestPresenter.toHTTP(result.value.chest),
      wallet: WalletPresenter.toHTTP(result.value.wallet),
    }
  }
}
