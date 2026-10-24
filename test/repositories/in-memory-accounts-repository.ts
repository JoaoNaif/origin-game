import { Account } from '@/domain/accounts/entities/account'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'

export class InMemoryAccountsRepository implements AccountsRepository {
  public items: Account[] = []

  async findById(id: string): Promise<Account | null> {
    return this.items.find((item) => item.id.toString() === id) ?? null
  }

  async findByUsername(username: string): Promise<Account | null> {
    return this.items.find((item) => item.username === username) ?? null
  }

  async create(account: Account): Promise<void> {
    this.items.push(account)
  }
}
