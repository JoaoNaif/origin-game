import { UseCaseError } from '@/core/errors/use-case-error'

export class InvalidNpcSquadError extends Error implements UseCaseError {
  constructor(reason: string) {
    super(`Squad de NPC inválido: ${reason}`)
  }
}
