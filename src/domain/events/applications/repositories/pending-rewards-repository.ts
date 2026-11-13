import { PendingReward } from '../../entities/pending-reward'

/** Porta da caixa de recompensas (D155, `events_brief.md` 4.4). */
export abstract class PendingRewardsRepository {
  abstract findById(id: string): Promise<PendingReward | null>
  /** As da conta ainda no prazo, da mais antiga para a mais nova. */
  abstract findActiveByAccountId(
    accountId: string,
    now: Date
  ): Promise<PendingReward[]>
  abstract create(reward: PendingReward): Promise<void>
  /** Tira da caixa (retirada ou descarte). `false` = já não estava (outra requisição tirou antes). */
  abstract delete(reward: PendingReward): Promise<boolean>
}
