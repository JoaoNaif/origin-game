import { Prisma, Chest as PrismaChest } from '@prisma/client'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Chest, ChestContents } from '@/domain/economy/entities/chest'

export class PrismaChestMapper {
  static toDomain(raw: PrismaChest): Chest {
    return Chest.restore(
      {
        accountId: new UniqueEntityId(raw.accountId),
        tier: raw.tier,
        source: raw.source,
        battleId: raw.battleId ? new UniqueEntityId(raw.battleId) : null,
        createdAt: raw.createdAt,
        openedAt: raw.openedAt,
        contents: (raw.contents as unknown as ChestContents | null) ?? null,
      },
      new UniqueEntityId(raw.id)
    )
  }

  static toPrisma(chest: Chest): Prisma.ChestUncheckedCreateInput {
    return {
      id: chest.id.toString(),
      accountId: chest.accountId.toString(),
      tier: chest.tier,
      source: chest.source,
      battleId: chest.battleId?.toString() ?? null,
      createdAt: chest.createdAt,
      openedAt: chest.openedAt,
      contents: chest.contents
        ? (chest.contents as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull,
    }
  }
}
