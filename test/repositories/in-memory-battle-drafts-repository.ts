import { BattleDraftsRepository } from '@/domain/combat/applications/repositories/battle-drafts-repository'
import { BattleDraft } from '@/domain/combat/entities/battle-draft'

export class InMemoryBattleDraftsRepository implements BattleDraftsRepository {
  public items: BattleDraft[] = []

  async findById(id: string): Promise<BattleDraft | null> {
    return this.items.find((item) => item.id.toString() === id) ?? null
  }

  async create(draft: BattleDraft): Promise<void> {
    this.items.push(draft)
  }

  async delete(draft: BattleDraft): Promise<void> {
    this.items = this.items.filter((item) => !item.id.equals(draft.id))
  }
}
