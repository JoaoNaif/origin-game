import { EventEntriesRepository } from '@/domain/events/applications/repositories/event-entries-repository'
import { EventEntry } from '@/domain/events/entities/event-entry'

function copy(entry: EventEntry): EventEntry {
  return EventEntry.restore(
    {
      accountId: entry.accountId,
      eventId: entry.eventId,
      clearedStages: entry.clearedStages,
      captureFailures: entry.captureFailures,
      lockedCharacterIds: entry.lockedCharacterIds
        ? [...entry.lockedCharacterIds]
        : null,
      attemptsDay: entry.attemptsDay,
      attemptsToday: entry.attemptsToday,
      attemptsTotal: entry.attemptsTotal,
      participated: entry.participated,
      completedAt: entry.completedAt,
      createdAt: entry.createdAt,
    },
    entry.id
  )
}

/** Guarda cópias, como o banco (uma participação por conta e evento). */
export class InMemoryEventEntriesRepository implements EventEntriesRepository {
  public items: EventEntry[] = []

  async findByAccountAndEvent(
    accountId: string,
    eventId: string
  ): Promise<EventEntry | null> {
    const entry = this.items.find(
      (item) =>
        item.accountId.toString() === accountId &&
        item.eventId.toString() === eventId
    )

    return entry ? copy(entry) : null
  }

  async findManyByAccountId(accountId: string): Promise<EventEntry[]> {
    return this.items
      .filter((item) => item.accountId.toString() === accountId)
      .map(copy)
  }

  async create(entry: EventEntry): Promise<void> {
    if (
      this.items.some(
        (item) =>
          item.accountId.equals(entry.accountId) &&
          item.eventId.equals(entry.eventId)
      )
    ) {
      throw new Error('participação repetida (conta + evento)')
    }
    this.items.push(copy(entry))
  }

  async save(entry: EventEntry): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(entry.id))
    if (index >= 0) this.items[index] = copy(entry)
  }
}
