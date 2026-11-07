import { Wallet, WalletChange } from '../../entities/wallet'
import { WalletsRepository } from '../repositories/wallets-repository'

/** Tentativas de um crédito quando outra operação grava a carteira no meio (ex.: comprar enquanto a batalha termina). */
const CREDIT_ATTEMPTS = 5

/**
 * Credita na carteira relendo e tentando de novo no conflito: um ganho (fim de batalha, baú aberto) não pode se perder
 * porque o jogador gastou ao mesmo tempo. Devolve a carteira já com o crédito.
 */
export async function creditWallet(
  walletsRepository: WalletsRepository,
  accountId: string,
  change: WalletChange
): Promise<Wallet> {
  for (let attempt = 1; ; attempt++) {
    const wallet = await walletsRepository.findByAccountId(accountId)
    wallet.earn(change)

    if (await walletsRepository.save(wallet)) return wallet
    if (attempt >= CREDIT_ATTEMPTS) {
      throw new Error(`creditWallet: conflito em ${attempt} tentativas`)
    }
  }
}
