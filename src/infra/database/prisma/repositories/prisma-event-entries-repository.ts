import { Injectable } from '@nestjs/common'
import { EventEntriesRepository } from '@/domain/events/applications/repositories/event-entries-repository'
import { EventEntry } from '@/domain/events/entities/event-entry'
import { PrismaEventEntryMapper } from '../mappers/prisma-event-mappers'
import { PrismaService } from '../prisma.service'

@Injectable()
export class PrismaEventEntriesRepository implements EventEntriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByAccountAndEvent(
    accountId: string,
    eventId: string
  ): Promise<EventEntry | null> {
    const row = await this.prisma.eventEntry.findUnique({
      where: { accountId_eventId: { accountId, eventId } },
    })

    return row ? PrismaEventEntryMapper.toDomain(row) : null
  }

  async findManyByAccountId(accountId: string): Promise<EventEntry[]> {
    const rows = await this.prisma.eventEntry.findMany({
      where: { accountId },
      orderBy: { createdAt: 'asc' },
    })

    return rows.map(PrismaEventEntryMapper.toDomain)
  }

  async create(entry: EventEntry): Promise<void> {
    await this.prisma.eventEntry.create({
      data: PrismaEventEntryMapper.toPrisma(entry),
    })
  }

  async save(entry: EventEntry): Promise<void> {
    const row = PrismaEventEntryMapper.toPrisma(entry)
    await this.prisma.eventEntry.update({
      where: { id: row.id },
      data: {
        clearedStages: row.clearedStages,
        captureFailures: row.captureFailures,
        lockedCharacterIds: row.lockedCharacterIds,
        attemptsDay: row.attemptsDay,
        attemptsToday: row.attemptsToday,
        attemptsTotal: row.attemptsTotal,
        participated: row.participated,
        completedAt: row.completedAt,
      },
    })
  }
}
