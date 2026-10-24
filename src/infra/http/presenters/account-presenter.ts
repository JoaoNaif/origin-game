import { Account } from '@/domain/accounts/entities/account'

// O que qualquer jogador pode ver de uma conta (é o que aparece na batalha).
export class AccountPresenter {
  static toHTTP(account: Account) {
    return {
      id: account.id.toString(),
      username: account.username,
      displayName: account.displayName,
    }
  }

  /** A própria conta (GET /me): também o papel, para o front saber se mostra as telas de admin. */
  static toCurrentHTTP(account: Account) {
    return { ...AccountPresenter.toHTTP(account), role: account.role }
  }
}
