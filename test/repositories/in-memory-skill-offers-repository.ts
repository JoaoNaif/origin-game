import { SkillOffersRepository } from '@/domain/characters/applications/repositories/skill-offers-repository'
import { SkillOffer } from '@/domain/characters/entities/skill-offer'

export class InMemorySkillOffersRepository implements SkillOffersRepository {
  public items: SkillOffer[] = []

  async findById(id: string): Promise<SkillOffer | null> {
    return this.items.find((item) => item.id.toString() === id) ?? null
  }

  async findPendingByCharacterIds(
    characterIds: string[]
  ): Promise<SkillOffer[]> {
    return this.items
      .filter(
        (item) =>
          item.isPending && characterIds.includes(item.characterId.toString())
      )
      .sort((a, b) => a.level - b.level)
  }

  async createMany(offers: SkillOffer[]): Promise<void> {
    this.items.push(...offers)
  }

  async save(offer: SkillOffer): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(offer.id))

    this.items[index] = offer
  }
}
