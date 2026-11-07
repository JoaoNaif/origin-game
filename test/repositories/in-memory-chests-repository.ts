import { ChestsRepository } from '@/domain/economy/applications/repositories/chests-repository'
import { Chest } from '@/domain/economy/entities/chest'

function copy(chest: Chest): Chest {
  return Chest.restore(
    {
      accountId: chest.accountId,
      tier: chest.tier,
      source: chest.source,
      battleId: chest.battleId,
      createdAt: chest.createdAt,
      openedAt: chest.openedAt,
      contents: chest.contents,
    },
    chest.id
  )
}

/** Guarda cópias, como o banco: abrir duas leituras do mesmo baú não divide o objeto. */
export class InMemoryChestsRepository implements ChestsRepository {
  public items: Chest[] = []

  async findById(id: string): Promise<Chest | null> {
    const chest = this.items.find((item) => item.id.toString() === id)

    return chest ? copy(chest) : null
  }

  async listClosedByAccountId(accountId: string): Promise<Chest[]> {
    return this.items
      .filter(
        (item) => item.accountId.toString() === accountId && !item.isOpened
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(copy)
  }

  async create(chest: Chest): Promise<void> {
    this.items.push(copy(chest))
  }

  async saveOpened(chest: Chest): Promise<boolean> {
    const index = this.items.findIndex((item) => item.id.equals(chest.id))
    if (index < 0 || this.items[index].isOpened) return false

    this.items[index] = copy(chest)

    return true
  }
}
