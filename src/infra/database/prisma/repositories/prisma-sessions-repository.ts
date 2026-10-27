import { Injectable } from '@nestjs/common'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { SessionsRepository } from '@/domain/accounts/applications/repositories/sessions-repository'
import { Session } from '@/domain/accounts/entities/session'
import { PrismaSessionMapper } from '../mappers/prisma-session-mapper'
import { PrismaService } from '../prisma.service'

@Injectable()
export class PrismaSessionsRepository implements SessionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const row = await this.prisma.session.findUnique({ where: { tokenHash } })

    return row ? PrismaSessionMapper.toDomain(row) : null
  }

  async create(session: Session): Promise<void> {
    await this.prisma.session.create({
      data: PrismaSessionMapper.toPrisma(session),
    })
  }

  async save(session: Session): Promise<void> {
    await this.prisma.session.update({
      where: { id: session.id.toString() },
      data: { revokedAt: session.revokedAt },
    })
  }

  async revokeAllByAccountId(
    accountId: UniqueEntityId,
    now: Date
  ): Promise<void> {
    await this.prisma.session.updateMany({
      where: { accountId: accountId.toString(), revokedAt: null },
      data: { revokedAt: now },
    })
  }

  async deleteAllByAccountId(accountId: UniqueEntityId): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { accountId: accountId.toString() },
    })
  }
}
