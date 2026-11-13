import { EventEntry } from '../../entities/event-entry'

/** Porta da participação das contas nos eventos (uma por conta e evento). */
export abstract class EventEntriesRepository {
  abstract findByAccountAndEvent(
    accountId: string,
    eventId: string
  ): Promise<EventEntry | null>
  abstract findManyByAccountId(accountId: string): Promise<EventEntry[]>
  abstract create(entry: EventEntry): Promise<void>
  abstract save(entry: EventEntry): Promise<void>
}
