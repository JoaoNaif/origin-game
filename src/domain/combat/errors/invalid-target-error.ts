import { UseCaseError } from '@/core/errors/use-case-error'

export class InvalidTargetError extends Error implements UseCaseError {
  constructor(reason: string) {
    super(`Alvo inválido: ${reason}`)
  }
}
