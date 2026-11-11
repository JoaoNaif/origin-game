import { UseCaseError } from '@/core/errors/use-case-error'

/** Equipamento vivo fora da regra (catálogo do admin ou ação do jogador: equipar, vender). */
export class InvalidGearError extends Error implements UseCaseError {
  constructor(reason: string) {
    super(`Equipamento inválido: ${reason}`)
  }
}
