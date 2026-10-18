import { UseCaseError } from '@/core/errors/use-case-error'

export class InvalidTraitError extends Error implements UseCaseError {
  constructor(reason: string) {
    super(`Traço inválido: ${reason}`)
  }
}
