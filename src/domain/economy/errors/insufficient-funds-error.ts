import { UseCaseError } from '@/core/errors/use-case-error'

/** Moeda ou fragmentos a menos que o custo. */
export class InsufficientFundsError extends Error implements UseCaseError {
  constructor(reason: string) {
    super(`Saldo insuficiente: ${reason}`)
  }
}
