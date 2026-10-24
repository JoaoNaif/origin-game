import { UseCaseError } from '@/core/errors/use-case-error'

export class InvalidSkillOfferError extends Error implements UseCaseError {
  constructor(reason: string) {
    super(`Oferta de skill inválida: ${reason}`)
  }
}
