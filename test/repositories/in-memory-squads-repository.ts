import { SquadsRepository } from '@/domain/squads/applications/repositories/squads-repository'
import { Squad } from '@/domain/squads/entities/squad'

export class InMemorySquadsRepository implements SquadsRepository {
  public items: Squad[] = []

  async findById(id: string): Promise<Squad | null> {
    return this.items.find((item) => item.id.toString() === id) ?? null
  }

  async findManyByAccountId(accountId: string): Promise<Squad[]> {
    return this.items.filter((item) => item.accountId.toString() === accountId)
  }

  async create(squad: Squad): Promise<void> {
    this.items.push(squad)
  }

  async save(squad: Squad): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(squad.id))

    this.items[index] = squad
  }

  async delete(squad: Squad): Promise<void> {
    this.items = this.items.filter((item) => !item.id.equals(squad.id))
  }
}
