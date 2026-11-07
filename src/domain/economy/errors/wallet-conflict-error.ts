import { UseCaseError } from '@/core/errors/use-case-error'

/** Outra operação mudou a carteira entre a leitura e a gravação (ex.: duas compras ao mesmo tempo). Nada foi gasto. */
export class WalletConflictError extends Error implements UseCaseError {
  constructor() {
    super('A carteira mudou durante a operação: tente de novo')
  }
}
