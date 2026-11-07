import { UseCaseError } from '@/core/errors/use-case-error'

export class InvalidAwakeningError extends Error implements UseCaseError {
  constructor(reason: string) {
    super(`Despertar inválido: ${reason}`)
  }
}
