import { Injectable } from '@nestjs/common'
import { GearRepository } from '@/domain/gear/applications/repositories/gear-repository'
import { Gear } from '@/domain/gear/entities/gear'
import { PrismaGearMapper } from '../mappers/prisma-gear-mapper'
import { PrismaService } from '../prisma.service'

@Injectable()
export class PrismaGearRepository implements GearRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Gear | null> {
    const row = await this.prisma.gear.findUnique({ where: { id } })

    return row ? PrismaGearMapper.toDomain(row) : null
  }

  async findManyByAccountId(accountId: string): Promise<Gear[]> {
    const rows = await this.prisma.gear.findMany({
      where: { accountId },
      orderBy: [{ acquiredAt: 'asc' }, { id: 'asc' }],
    })

    return rows.map(PrismaGearMapper.toDomain)
  }

  async countByAccountId(accountId: string): Promise<number> {
    return this.prisma.gear.count({ where: { accountId } })
  }

  async findEquippedByCharacterIds(characterIds: string[]): Promise<Gear[]> {
    if (characterIds.length === 0) return []
    const rows = await this.prisma.gear.findMany({
      where: { characterId: { in: characterIds } },
    })

    return rows.map(PrismaGearMapper.toDomain)
  }

  async create(gear: Gear): Promise<void> {
    await this.prisma.gear.create({ data: PrismaGearMapper.toPrisma(gear) })
  }

  /** Quem sai do slot grava antes (o slot é único por personagem). */
  async saveMany(gear: Gear[]): Promise<void> {
    const ordered = [...gear].sort(
      (a, b) => Number(a.isEquipped) - Number(b.isEquipped)
    )

    await this.prisma.$transaction(
      ordered.map((g) =>
        this.prisma.gear.update({
          where: { id: g.id.toString() },
          data: { characterId: g.characterId?.toString() ?? null },
        })
      )
    )
  }

  async delete(gear: Gear): Promise<boolean> {
    const deleted = await this.prisma.gear.deleteMany({
      where: { id: gear.id.toString() },
    })

    return deleted.count > 0
  }
}
