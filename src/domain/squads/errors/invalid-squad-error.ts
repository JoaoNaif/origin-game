import { UseCaseError } from '@/core/errors/use-case-error'

export class InvalidSquadError extends Error implements UseCaseError {
  constructor(reason: string) {
    super(`Squad inválido: ${reason}`)
  }
}
