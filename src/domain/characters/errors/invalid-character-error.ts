import { UseCaseError } from '@/core/errors/use-case-error'

export class InvalidCharacterError extends Error implements UseCaseError {
  constructor(reason: string) {
    super(`Personagem inválido: ${reason}`)
  }
}
