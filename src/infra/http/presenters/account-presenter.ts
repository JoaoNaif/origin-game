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
}
