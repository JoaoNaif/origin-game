import { UseCaseError } from '@/core/errors/use-case-error'

/** Evento fora da regra (catálogo do admin, ou o jogador: evento fechado, requisito, tentativas, squad travado). */
export class InvalidEventError extends Error implements UseCaseError {
  constructor(reason: string) {
    super(`Evento: ${reason}`)
  }
}
