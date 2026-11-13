import { Injectable } from '@nestjs/common'
import { PendingRewardsRepository } from '@/domain/events/applications/repositories/pending-rewards-repository'
import { PendingReward } from '@/domain/events/entities/pending-reward'
import { PrismaPendingRewardMapper } from '../mappers/prisma-event-mappers'
import { PrismaService } from '../prisma.service'

@Injectable()
export class PrismaPendingRewardsRepository implements PendingRewardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<PendingReward | null> {
    const row = await this.prisma.pendingReward.findUnique({ where: { id } })

    return row ? PrismaPendingRewardMapper.toDomain(row) : null
  }

  async findActiveByAccountId(
    accountId: string,
    now: Date
  ): Promise<PendingReward[]> {
    const rows = await this.prisma.pendingReward.findMany({
      where: { accountId, expiresAt: { gt: now } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    })

    return rows.map(PrismaPendingRewardMapper.toDomain)
  }

  async create(reward: PendingReward): Promise<void> {
    await this.prisma.pendingReward.create({
      data: PrismaPendingRewardMapper.toPrisma(reward),
    })
  }

  async delete(reward: PendingReward): Promise<boolean> {
    // deleteMany não falha se já saiu: count 0 = outra requisição tirou antes
    const { count } = await this.prisma.pendingReward.deleteMany({
      where: { id: reward.id.toString() },
    })

    return count > 0
  }
}
