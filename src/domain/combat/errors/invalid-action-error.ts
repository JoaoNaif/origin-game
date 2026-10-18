import { UseCaseError } from '@/core/errors/use-case-error'

export class InvalidActionError extends Error implements UseCaseError {
  constructor(reason: string) {
    super(`Ação inválida: ${reason}`)
  }
}
