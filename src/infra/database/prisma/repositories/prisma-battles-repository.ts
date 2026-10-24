import { Injectable } from '@nestjs/common'
import { BattlesRepository } from '@/domain/combat/applications/repositories/battles-repository'
import { Battle } from '@/domain/combat/entities/battle'
import {
  battleInclude,
  PrismaBattleMapper,
} from '../mappers/prisma-battle-mapper'
import { PrismaService } from '../prisma.service'

@Injectable()
export class PrismaBattlesRepository implements BattlesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Battle | null> {
    const row = await this.prisma.battle.findUnique({
      where: { id },
      include: battleInclude,
    })

    return row ? PrismaBattleMapper.toDomain(row) : null
  }

  async findRecentFinishedByAccountId(
    accountId: string,
    limit: number
  ): Promise<Battle[]> {
    const rows = await this.prisma.battle.findMany({
      where: { accountId, status: 'FINISHED' },
      include: battleInclude,
      orderBy: { finishedAt: 'desc' },
      take: limit,
    })

    return rows.map(PrismaBattleMapper.toDomain)
  }

  async create(battle: Battle): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.battle.create({ data: PrismaBattleMapper.toPrisma(battle) }),
      this.prisma.battleAction.createMany({
        data: PrismaBattleMapper.toPrismaActions(battle),
      }),
    ])
  }

  /** O log só cresce: grava as ações que ainda não estão no banco e o fim da batalha. */
  async save(battle: Battle): Promise<void> {
    const { id, status, winner, endReason, rounds, finishedAt } =
      PrismaBattleMapper.toPrisma(battle)

    await this.prisma.$transaction([
      this.prisma.battleAction.createMany({
        data: PrismaBattleMapper.toPrismaActions(battle),
        skipDuplicates: true,
      }),
      this.prisma.battle.update({
        where: { id },
        data: { status, winner, endReason, rounds, finishedAt },
      }),
    ])
  }
}
