import { GearRepository } from '@/domain/gear/applications/repositories/gear-repository'
import { Gear } from '@/domain/gear/entities/gear'

function copy(gear: Gear): Gear {
  return Gear.restore(
    {
      accountId: gear.accountId,
      templateId: gear.templateId,
      characterId: gear.characterId,
      source: gear.source,
      acquiredAt: gear.acquiredAt,
    },
    gear.id
  )
}

/** Guarda cópias, como o banco; confere o slot único por personagem. */
export class InMemoryGearRepository implements GearRepository {
  public items: Gear[] = []

  async findById(id: string): Promise<Gear | null> {
    const gear = this.items.find((item) => item.id.toString() === id)

    return gear ? copy(gear) : null
  }

  async findManyByAccountId(accountId: string): Promise<Gear[]> {
    return this.items
      .filter((item) => item.accountId.toString() === accountId)
      .sort((a, b) => a.acquiredAt.getTime() - b.acquiredAt.getTime())
      .map(copy)
  }

  async countByAccountId(accountId: string): Promise<number> {
    return this.items.filter((item) => item.accountId.toString() === accountId)
      .length
  }

  async findEquippedByCharacterIds(characterIds: string[]): Promise<Gear[]> {
    return this.items
      .filter(
        (item) =>
          item.characterId !== null &&
          characterIds.includes(item.characterId.toString())
      )
      .map(copy)
  }

  async create(gear: Gear): Promise<void> {
    this.items.push(copy(gear))
  }

  async saveMany(gear: Gear[]): Promise<void> {
    const next = this.items.map((item) => {
      const changed = gear.find((g) => g.id.equals(item.id))
      return changed ? copy(changed) : item
    })

    const slots = next
      .filter((item) => item.characterId)
      .map((item) => item.characterId!.toString())
    if (new Set(slots).size !== slots.length) {
      throw new Error('InMemoryGearRepository: dois equipamentos no mesmo slot')
    }

    this.items = next
  }

  async delete(gear: Gear): Promise<boolean> {
    const before = this.items.length
    this.items = this.items.filter((item) => !item.id.equals(gear.id))

    return this.items.length < before
  }
}
