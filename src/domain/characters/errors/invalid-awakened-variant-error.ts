import { UseCaseError } from '@/core/errors/use-case-error'

export class InvalidAwakenedVariantError extends Error implements UseCaseError {
  constructor(reason: string) {
    super(`Variante despertada inválida: ${reason}`)
  }
}
