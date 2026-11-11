import { Prisma, Gear as PrismaGear } from '@prisma/client'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Gear } from '@/domain/gear/entities/gear'

export class PrismaGearMapper {
  static toDomain(raw: PrismaGear): Gear {
    return Gear.restore(
      {
        accountId: new UniqueEntityId(raw.accountId),
        templateId: new UniqueEntityId(raw.templateId),
        characterId: raw.characterId
          ? new UniqueEntityId(raw.characterId)
          : null,
        source: raw.source,
        acquiredAt: raw.acquiredAt,
      },
      new UniqueEntityId(raw.id)
    )
  }

  static toPrisma(gear: Gear): Prisma.GearUncheckedCreateInput {
    return {
      id: gear.id.toString(),
      accountId: gear.accountId.toString(),
      templateId: gear.templateId.toString(),
      characterId: gear.characterId?.toString() ?? null,
      source: gear.source,
      acquiredAt: gear.acquiredAt,
    }
  }
}
