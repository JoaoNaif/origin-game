import { Injectable } from '@nestjs/common'
import { BeastsRepository } from '@/domain/beasts/applications/repositories/beasts-repository'
import { Beast } from '@/domain/beasts/entities/beast'
import { PrismaBeastMapper } from '../mappers/prisma-beast-mapper'
import { PrismaService } from '../prisma.service'

@Injectable()
export class PrismaBeastsRepository implements BeastsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Beast | null> {
    const row = await this.prisma.beast.findUnique({ where: { id } })

    return row ? PrismaBeastMapper.toDomain(row) : null
  }

  async findManyByAccountId(accountId: string): Promise<Beast[]> {
    const rows = await this.prisma.beast.findMany({
      where: { accountId },
      orderBy: [{ acquiredAt: 'asc' }, { id: 'asc' }],
    })

    return rows.map(PrismaBeastMapper.toDomain)
  }

  async countByAccountId(accountId: string): Promise<number> {
    return this.prisma.beast.count({ where: { accountId } })
  }

  async findManyByCharacterIds(characterIds: string[]): Promise<Beast[]> {
    if (characterIds.length === 0) return []
    const rows = await this.prisma.beast.findMany({
      where: { characterId: { in: characterIds } },
      orderBy: [{ slot: 'asc' }],
    })

    return rows.map(PrismaBeastMapper.toDomain)
  }

  async create(beast: Beast): Promise<void> {
    await this.prisma.beast.create({ data: PrismaBeastMapper.toPrisma(beast) })
  }

  async save(beast: Beast): Promise<void> {
    await this.prisma.beast.update({
      where: { id: beast.id.toString() },
      data: {
        characterId: beast.characterId?.toString() ?? null,
        slot: beast.slot,
      },
    })
  }

  async delete(beast: Beast): Promise<boolean> {
    const deleted = await this.prisma.beast.deleteMany({
      where: { id: beast.id.toString() },
    })

    return deleted.count > 0
  }
}
