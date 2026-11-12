import { BeastsRepository } from '@/domain/beasts/applications/repositories/beasts-repository'
import { Beast } from '@/domain/beasts/entities/beast'

function copy(beast: Beast): Beast {
  return Beast.restore(
    {
      accountId: beast.accountId,
      templateId: beast.templateId,
      characterId: beast.characterId,
      slot: beast.slot,
      source: beast.source,
      acquiredAt: beast.acquiredAt,
    },
    beast.id
  )
}

/** Guarda cópias, como o banco. */
export class InMemoryBeastsRepository implements BeastsRepository {
  public items: Beast[] = []

  async findById(id: string): Promise<Beast | null> {
    const beast = this.items.find((item) => item.id.toString() === id)

    return beast ? copy(beast) : null
  }

  async findManyByAccountId(accountId: string): Promise<Beast[]> {
    return this.items
      .filter((item) => item.accountId.toString() === accountId)
      .sort((a, b) => a.acquiredAt.getTime() - b.acquiredAt.getTime())
      .map(copy)
  }

  async countByAccountId(accountId: string): Promise<number> {
    return this.items.filter((item) => item.accountId.toString() === accountId)
      .length
  }

  async findManyByCharacterIds(characterIds: string[]): Promise<Beast[]> {
    return this.items
      .filter(
        (item) =>
          item.characterId !== null &&
          characterIds.includes(item.characterId.toString())
      )
      .map(copy)
  }

  async create(beast: Beast): Promise<void> {
    this.items.push(copy(beast))
  }

  async save(beast: Beast): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(beast.id))
    if (index >= 0) this.items[index] = copy(beast)
  }

  async delete(beast: Beast): Promise<boolean> {
    const before = this.items.length
    this.items = this.items.filter((item) => !item.id.equals(beast.id))

    return this.items.length < before
  }
}
