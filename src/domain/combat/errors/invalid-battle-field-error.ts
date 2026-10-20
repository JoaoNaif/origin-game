import { UseCaseError } from '@/core/errors/use-case-error'

export class InvalidBattleFieldError extends Error implements UseCaseError {
  constructor(reason: string) {
    super(`Campo de batalha inválido: ${reason}`)
  }
}
