import { Prisma } from '@prisma/client'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Squad } from '@/domain/squads/entities/squad'

export const squadInclude = {
  members: { orderBy: [{ row: 'asc' }, { column: 'asc' }] },
} satisfies Prisma.SquadInclude

export type PrismaSquad = Prisma.SquadGetPayload<{
  include: typeof squadInclude
}>

export class PrismaSquadMapper {
  static toDomain(raw: PrismaSquad): Squad {
    return Squad.restore(
      {
        accountId: new UniqueEntityId(raw.accountId),
        name: raw.name,
        members: raw.members.map((m) => ({
          characterId: new UniqueEntityId(m.characterId),
          row: m.row,
          column: m.column,
        })),
      },
      new UniqueEntityId(raw.id)
    )
  }

  static toPrismaMembers(squad: Squad) {
    return squad.members.map((m) => ({
      characterId: m.characterId.toString(),
      row: m.row,
      column: m.column,
    }))
  }
}
