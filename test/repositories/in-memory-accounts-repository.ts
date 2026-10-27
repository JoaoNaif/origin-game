import { Account } from '@/domain/accounts/entities/account'
import {
  AccountSummary,
  AccountsRepository,
} from '@/domain/accounts/applications/repositories/accounts-repository'

export class InMemoryAccountsRepository implements AccountsRepository {
  public items: Account[] = []

  async findById(id: string): Promise<Account | null> {
    return this.items.find((item) => item.id.toString() === id) ?? null
  }

  async findByUsername(username: string): Promise<Account | null> {
    return this.items.find((item) => item.username === username) ?? null
  }

  /** Sem os outros repositórios aqui: as contagens vêm zeradas. */
  async listSummaries(): Promise<AccountSummary[]> {
    return [...this.items]
      .sort((a, b) => a.username.localeCompare(b.username))
      .map((account) => ({ account, characters: 0, battles: 0 }))
  }

  async create(account: Account): Promise<void> {
    this.items.push(account)
  }
}
