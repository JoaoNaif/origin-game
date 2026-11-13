import { PendingRewardsRepository } from '@/domain/events/applications/repositories/pending-rewards-repository'
import { PendingReward } from '@/domain/events/entities/pending-reward'

function copy(reward: PendingReward): PendingReward {
  return PendingReward.restore(
    {
      accountId: reward.accountId,
      reward: { ...reward.reward },
      eventId: reward.eventId,
      createdAt: reward.createdAt,
      expiresAt: reward.expiresAt,
    },
    reward.id
  )
}

/** Guarda cópias, como o banco. */
export class InMemoryPendingRewardsRepository implements PendingRewardsRepository {
  public items: PendingReward[] = []

  async findById(id: string): Promise<PendingReward | null> {
    const reward = this.items.find((item) => item.id.toString() === id)

    return reward ? copy(reward) : null
  }

  async findActiveByAccountId(
    accountId: string,
    now: Date
  ): Promise<PendingReward[]> {
    return this.items
      .filter(
        (item) =>
          item.accountId.toString() === accountId && !item.isExpiredAt(now)
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(copy)
  }

  async create(reward: PendingReward): Promise<void> {
    this.items.push(copy(reward))
  }

  async delete(reward: PendingReward): Promise<boolean> {
    const before = this.items.length
    this.items = this.items.filter((item) => !item.id.equals(reward.id))

    return this.items.length < before
  }
}
