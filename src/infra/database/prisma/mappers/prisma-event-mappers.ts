import {
  Prisma,
  EventEntry as PrismaEventEntry,
  PendingReward as PrismaPendingReward,
} from '@prisma/client'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { EventEntry } from '@/domain/events/entities/event-entry'
import { PendingReward } from '@/domain/events/entities/pending-reward'
import { EventReward } from '@/domain/events/value-objects/event-reward'

/** JSON gravado pelo próprio domínio. */
const json = (value: unknown) => value as Prisma.InputJsonValue

export class PrismaEventEntryMapper {
  static toDomain(raw: PrismaEventEntry): EventEntry {
    return EventEntry.restore(
      {
        accountId: new UniqueEntityId(raw.accountId),
        eventId: new UniqueEntityId(raw.eventId),
        clearedStages: raw.clearedStages,
        captureFailures: raw.captureFailures,
        lockedCharacterIds:
          (raw.lockedCharacterIds as unknown as string[] | null) ?? null,
        attemptsDay: raw.attemptsDay,
        attemptsToday: raw.attemptsToday,
        attemptsTotal: raw.attemptsTotal,
        participated: raw.participated,
        completedAt: raw.completedAt,
        createdAt: raw.createdAt,
      },
      new UniqueEntityId(raw.id)
    )
  }

  static toPrisma(entry: EventEntry): Prisma.EventEntryUncheckedCreateInput {
    return {
      id: entry.id.toString(),
      accountId: entry.accountId.toString(),
      eventId: entry.eventId.toString(),
      clearedStages: entry.clearedStages,
      captureFailures: entry.captureFailures,
      lockedCharacterIds: entry.lockedCharacterIds
        ? json(entry.lockedCharacterIds)
        : Prisma.DbNull,
      attemptsDay: entry.attemptsDay,
      attemptsToday: entry.attemptsToday,
      attemptsTotal: entry.attemptsTotal,
      participated: entry.participated,
      completedAt: entry.completedAt,
      createdAt: entry.createdAt,
    }
  }
}

export class PrismaPendingRewardMapper {
  static toDomain(raw: PrismaPendingReward): PendingReward {
    return PendingReward.restore(
      {
        accountId: new UniqueEntityId(raw.accountId),
        reward: raw.reward as unknown as EventReward,
        eventId: raw.eventId ? new UniqueEntityId(raw.eventId) : null,
        createdAt: raw.createdAt,
        expiresAt: raw.expiresAt,
      },
      new UniqueEntityId(raw.id)
    )
  }

  static toPrisma(
    reward: PendingReward
  ): Prisma.PendingRewardUncheckedCreateInput {
    return {
      id: reward.id.toString(),
      accountId: reward.accountId.toString(),
      eventId: reward.eventId?.toString() ?? null,
      reward: json(reward.reward),
      createdAt: reward.createdAt,
      expiresAt: reward.expiresAt,
    }
  }
}
