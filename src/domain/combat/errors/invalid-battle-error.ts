import { UseCaseError } from '@/core/errors/use-case-error'

export class InvalidBattleError extends Error implements UseCaseError {
  constructor(reason: string) {
    super(`Batalha inválida: ${reason}`)
  }
}
