import { Prisma, Beast as PrismaBeast } from '@prisma/client'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Beast } from '@/domain/beasts/entities/beast'

export class PrismaBeastMapper {
  static toDomain(raw: PrismaBeast): Beast {
    return Beast.restore(
      {
        accountId: new UniqueEntityId(raw.accountId),
        templateId: new UniqueEntityId(raw.templateId),
        characterId: raw.characterId
          ? new UniqueEntityId(raw.characterId)
          : null,
        slot: raw.slot,
        source: raw.source,
        acquiredAt: raw.acquiredAt,
      },
      new UniqueEntityId(raw.id)
    )
  }

  static toPrisma(beast: Beast): Prisma.BeastUncheckedCreateInput {
    return {
      id: beast.id.toString(),
      accountId: beast.accountId.toString(),
      templateId: beast.templateId.toString(),
      characterId: beast.characterId?.toString() ?? null,
      slot: beast.slot,
      source: beast.source,
      acquiredAt: beast.acquiredAt,
    }
  }
}
