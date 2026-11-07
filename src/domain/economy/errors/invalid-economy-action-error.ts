import { UseCaseError } from '@/core/errors/use-case-error'

/** Operação de economia fora da regra (baú que não se compra, quantidade inválida, limite de fragmentos, baú já aberto). */
export class InvalidEconomyActionError extends Error implements UseCaseError {
  constructor(reason: string) {
    super(`Operação inválida: ${reason}`)
  }
}
