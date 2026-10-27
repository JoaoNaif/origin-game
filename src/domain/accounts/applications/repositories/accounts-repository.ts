import { Account } from '../../entities/account'

/** A conta na lista do admin, com quantos personagens e batalhas tem. */
export interface AccountSummary {
  account: Account
  characters: number
  battles: number
}

/** Porta de persistência das contas (token de injeção no Nest; implementação em `infra/database`). */
export abstract class AccountsRepository {
  abstract findById(id: string): Promise<Account | null>
  abstract findByUsername(username: string): Promise<Account | null>
  /** Todas as contas, pelo username (tela do admin). */
  abstract listSummaries(): Promise<AccountSummary[]>
  abstract create(account: Account): Promise<void>
}
