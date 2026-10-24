import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import {
  BattleListFilter,
  BattleSummary,
  BattlesRepository,
} from '@/domain/combat/applications/repositories/battles-repository'
import { Battle } from '@/domain/combat/entities/battle'
import {
  battleInclude,
  PrismaBattleMapper,
} from '../mappers/prisma-battle-mapper'
import { PrismaService } from '../prisma.service'

/** A batalha já tinha acabado quando esta gravação chegou (desfaz a transação). */
class BattleAlreadyFinished extends Error {}

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

  /** Sem a foto e sem o log: o nome do adversário vem do squad de NPC (ou "Máquina", se ele foi apagado). */
  async listByAccountId(
    accountId: string,
    filter: BattleListFilter
  ): Promise<BattleSummary[]> {
    const rows = await this.prisma.battle.findMany({
      where: { accountId, status: filter.status },
      select: {
        id: true,
        mode: true,
        status: true,
        squadId: true,
        npcSquadId: true,
        aiProfile: true,
        aiDifficulty: true,
        winner: true,
        endReason: true,
        rounds: true,
        startedAt: true,
        finishedAt: true,
        npcSquad: { select: { name: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: filter.limit,
    })

    return rows.map(({ npcSquad, aiProfile, aiDifficulty, ...row }) => ({
      ...row,
      opponent: {
        name: npcSquad?.name ?? 'Máquina',
        profile: aiProfile,
        difficulty: aiDifficulty,
      },
    }))
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
   * garante que só uma de duas jogadas enviadas ao mesmo tempo entra; e a batalha só é atualizada se ainda está em
   * andamento (desistir enquanto uma jogada roda). Quem perde não grava nada.
   */
  async save(battle: Battle, knownActions: number): Promise<boolean> {
    const { id, status, winner, endReason, rounds, finishedAt } =
      PrismaBattleMapper.toPrisma(battle)
    const newActions = PrismaBattleMapper.toPrismaActions(battle).filter(
      (a) => a.sequence >= knownActions
    )

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.battleAction.createMany({ data: newActions })
        const updated = await tx.battle.updateMany({
          where: { id, status: 'IN_PROGRESS' },
          data: { status, winner, endReason, rounds, finishedAt },
        })
        if (updated.count === 0) throw new BattleAlreadyFinished()
      })
    } catch (error) {
      if (
        error instanceof BattleAlreadyFinished ||
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002')
      ) {
        return false
      }
      throw error
    }

    return true
  }

  async saveRewards(battle: Battle): Promise<void> {
    await this.prisma.battle.update({
      where: { id: battle.id.toString() },
      data: { rewards: PrismaBattleMapper.toPrisma(battle).rewards },
    })
  }
}
