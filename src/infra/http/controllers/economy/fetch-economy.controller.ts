import { Controller, Get } from '@nestjs/common'
import {
  BATTLE_CHEST_DROP,
  BATTLE_COINS,
  BATTLE_FRAGMENTS,
  CHEST_FRAGMENTS,
  CHEST_PRICE,
  ENHANCEMENT_BASE_CHANCE,
  ENHANCEMENT_COST,
  FRAGMENT_CAP,
  FRAGMENT_PRICE,
  LOSS_CHEST_DROP_FACTOR,
  RARITY_ORDER,
  RARITY_SALE_VALUE,
} from '@/domain/economy/economy-values'
import { chestRarityChances } from '@/domain/economy/services/chest-draw'
import { Public } from '@/infra/auth/public'

/**
 * GET /economy — os valores da economia (D100, D104, D150) para o front mostrar preços e chances: baús (preço, chance
 * de cada raridade, fragmentos), fragmentos, aprimoramento e o que a batalha dá. Público, como o catálogo.
 */
@Controller('economy')
@Public()
export class FetchEconomyController {
  @Get()
  handle() {
    return {
      chests: RARITY_ORDER.map((tier) => ({
        tier,
        price: CHEST_PRICE[tier] ?? null,
        fragments: CHEST_FRAGMENTS[tier],
        rarityChances: chestRarityChances(tier),
      })),
      raritySaleValue: RARITY_SALE_VALUE,
      fragments: {
        cap: FRAGMENT_CAP,
        buyPrice: FRAGMENT_PRICE.BUY,
        sellPrice: FRAGMENT_PRICE.SELL,
      },
      enhancement: {
        chance: ENHANCEMENT_BASE_CHANCE,
        cost: ENHANCEMENT_COST,
      },
      battle: {
        coins: BATTLE_COINS,
        fragments: BATTLE_FRAGMENTS,
        chestDrop: BATTLE_CHEST_DROP,
        lossChestDropFactor: LOSS_CHEST_DROP_FACTOR,
      },
    }
  }
}
