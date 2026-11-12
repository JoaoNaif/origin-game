import { UseCaseError } from '@/core/errors/use-case-error'

/** Besta fora da regra (catálogo do admin ou ação do jogador: firmar contrato, trocar o slot, vender). */
export class InvalidBeastError extends Error implements UseCaseError {
  constructor(reason: string) {
    super(`Besta inválida: ${reason}`)
  }
}
