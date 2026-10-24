import { BattlesRepository } from '@/domain/combat/applications/repositories/battles-repository'
import { Battle } from '@/domain/combat/entities/battle'

export class InMemoryBattlesRepository implements BattlesRepository {
  public items: Battle[] = []

  async findById(id: string): Promise<Battle | null> {
    return this.items.find((item) => item.id.toString() === id) ?? null
  }

  async findRecentFinishedByAccountId(
    accountId: string,
    limit: number
  ): Promise<Battle[]> {
    return this.items
      .filter(
        (item) => item.accountId.toString() === accountId && item.isFinished
      )
      .sort((a, b) => b.finishedAt!.getTime() - a.finishedAt!.getTime())
      .slice(0, limit)
  }

  async create(battle: Battle): Promise<void> {
    this.items.push(battle)
  }

  async save(battle: Battle): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(battle.id))

    this.items[index] = battle
  }
}
