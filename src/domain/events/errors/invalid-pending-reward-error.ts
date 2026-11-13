import { UseCaseError } from '@/core/errors/use-case-error'

/** Recompensa da caixa que não pode ser retirada (vencida, já retirada, inventário ainda cheio). */
export class InvalidPendingRewardError extends Error implements UseCaseError {
  constructor(reason: string) {
    super(`Recompensa pendente: ${reason}`)
  }
}
