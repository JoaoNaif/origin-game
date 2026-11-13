import { PendingReward } from '@/domain/events/entities/pending-reward'

/** Prêmio na caixa de recompensas (D155, 4.4): o front mostra a data limite. */
export class PendingRewardPresenter {
  static toHTTP(pending: PendingReward) {
    return {
      id: pending.id.toString(),
      reward: pending.reward,
      eventId: pending.eventId?.toString() ?? null,
      createdAt: pending.createdAt,
      expiresAt: pending.expiresAt,
    }
  }
}
