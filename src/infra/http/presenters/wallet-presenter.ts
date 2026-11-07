import { FRAGMENT_CAP } from '@/domain/economy/economy-values'
import { Wallet } from '@/domain/economy/entities/wallet'

/** Moeda e os 7 tipos de fragmento (`NONE` = Neutro), com zero nos que faltam. */
export class WalletPresenter {
  static toHTTP(wallet: Wallet) {
    return {
      coins: wallet.coins,
      fragments: wallet.fragments,
      fragmentCap: FRAGMENT_CAP,
    }
  }
}
