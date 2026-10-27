import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { SessionsRepository } from '@/domain/accounts/applications/repositories/sessions-repository'
import { Session } from '@/domain/accounts/entities/session'

export class InMemorySessionsRepository implements SessionsRepository {
  public items: Session[] = []

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    return this.items.find((item) => item.tokenHash === tokenHash) ?? null
  }

  async create(session: Session): Promise<void> {
    this.items.push(session)
  }

  async save(session: Session): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(session.id))

    this.items[index] = session
  }

  async revokeAllByAccountId(
    accountId: UniqueEntityId,
    now: Date
  ): Promise<void> {
    for (const session of this.items) {
      if (session.accountId.equals(accountId)) session.revoke(now)
    }
  }

  async deleteAllByAccountId(accountId: UniqueEntityId): Promise<void> {
    this.items = this.items.filter((item) => !item.accountId.equals(accountId))
  }
}
