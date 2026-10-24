import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
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

  /**
   * O log só cresce: grava as ações a partir de `knownActions` e o fim, numa transação. A chave (batalha + sequência)
   * garante que só uma de duas jogadas enviadas ao mesmo tempo entra: a outra bate na chave e nada dela fica.
   */
  async save(battle: Battle, knownActions: number): Promise<boolean> {
    const { id, status, winner, endReason, rounds, finishedAt } =
      PrismaBattleMapper.toPrisma(battle)
    const newActions = PrismaBattleMapper.toPrismaActions(battle).filter(
      (a) => a.sequence >= knownActions
    )

    try {
      await this.prisma.$transaction([
        this.prisma.battleAction.createMany({ data: newActions }),
        this.prisma.battle.update({
          where: { id },
          data: { status, winner, endReason, rounds, finishedAt },
        }),
      ])
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return false
      }
      throw error
    }

    return true
  }
}
