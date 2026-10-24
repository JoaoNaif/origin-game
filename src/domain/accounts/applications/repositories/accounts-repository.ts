import { Account } from '../../entities/account'

/** Porta de persistência das contas (token de injeção no Nest; implementação em `infra/database`). */
export abstract class AccountsRepository {
  abstract findById(id: string): Promise<Account | null>
  abstract findByUsername(username: string): Promise<Account | null>
  abstract create(account: Account): Promise<void>
}
