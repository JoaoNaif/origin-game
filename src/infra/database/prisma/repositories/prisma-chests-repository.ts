import { Injectable } from '@nestjs/common'
import { ChestsRepository } from '@/domain/economy/applications/repositories/chests-repository'
import { Chest } from '@/domain/economy/entities/chest'
import { PrismaChestMapper } from '../mappers/prisma-chest-mapper'
import { PrismaService } from '../prisma.service'

@Injectable()
export class PrismaChestsRepository implements ChestsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Chest | null> {
    const row = await this.prisma.chest.findUnique({ where: { id } })

    return row ? PrismaChestMapper.toDomain(row) : null
  }

  async listClosedByAccountId(accountId: string): Promise<Chest[]> {
    const rows = await this.prisma.chest.findMany({
      where: { accountId, openedAt: null },
      orderBy: { createdAt: 'asc' },
    })

    return rows.map(PrismaChestMapper.toDomain)
  }

  async create(chest: Chest): Promise<void> {
    await this.prisma.chest.create({ data: PrismaChestMapper.toPrisma(chest) })
  }

  /** Só abre o que ainda está fechado: de duas aberturas ao mesmo tempo, só uma grava. */
  async saveOpened(chest: Chest): Promise<boolean> {
    const { id, openedAt, contents } = PrismaChestMapper.toPrisma(chest)
    const updated = await this.prisma.chest.updateMany({
      where: { id, openedAt: null },
      data: { openedAt, contents },
    })

    return updated.count > 0
  }
}
