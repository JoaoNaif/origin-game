import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { Character } from '@/domain/characters/entities/character'

export class InMemoryCharactersRepository implements CharactersRepository {
  public items: Character[] = []

  async findById(id: string): Promise<Character | null> {
    return this.items.find((item) => item.id.toString() === id) ?? null
  }

  async findManyByAccountId(accountId: string): Promise<Character[]> {
    return this.items.filter((item) => item.accountId.toString() === accountId)
  }

  async findManyByIds(ids: string[]): Promise<Character[]> {
    return this.items.filter((item) => ids.includes(item.id.toString()))
  }

  async createMany(characters: Character[]): Promise<void> {
    this.items.push(...characters)
  }

  async save(character: Character): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(character.id))

    this.items[index] = character
  }
}
