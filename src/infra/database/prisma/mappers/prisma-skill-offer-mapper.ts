import { Prisma, SkillOffer as PrismaSkillOffer } from '@prisma/client'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { SkillOffer } from '@/domain/characters/entities/skill-offer'

export class PrismaSkillOfferMapper {
  static toDomain(raw: PrismaSkillOffer): SkillOffer {
    const result = SkillOffer.create(
      {
        characterId: new UniqueEntityId(raw.characterId),
        level: raw.level,
        skillIds: raw.skillIds.map((id) => new UniqueEntityId(id)),
        chosenSkillId: raw.chosenSkillId
          ? new UniqueEntityId(raw.chosenSkillId)
          : null,
        createdAt: raw.createdAt,
        chosenAt: raw.chosenAt,
      },
      new UniqueEntityId(raw.id)
    )

    // o banco só guarda blocos que já passaram pelo domínio
    if (result.isLeft()) throw result.value

    return result.value
  }

  static toPrisma(offer: SkillOffer): Prisma.SkillOfferCreateManyInput {
    return {
      id: offer.id.toString(),
      characterId: offer.characterId.toString(),
      level: offer.level,
      skillIds: offer.skillIds.map((id) => id.toString()),
      chosenSkillId: offer.chosenSkillId?.toString() ?? null,
      createdAt: offer.createdAt,
      chosenAt: offer.chosenAt,
    }
  }
}
