import { Wallet } from '../../entities/wallet'

/** Porta da carteira da conta (moeda e fragmentos) e do registro de cada mudança. */
export abstract class WalletsRepository {
  /** A carteira da conta; vazia (versão 0) se a conta ainda não ganhou nada. */
  abstract findByAccountId(accountId: string): Promise<Wallet>
  /**
   * Grava a carteira e as linhas novas do registro (`wallet.entries`), só se ninguém gravou desde a leitura (mesma
   * `version`). Devolve `false` no conflito: nada é gravado.
   */
  abstract save(wallet: Wallet): Promise<boolean>
}
