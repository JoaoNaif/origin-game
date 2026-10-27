import { UseCaseError } from '@/core/errors/use-case-error'

/** A mudança deixaria o catálogo inteiro inválido (ex.: a build de um NPC ou o kit de um modelo quebra). */
export class InvalidCatalogError extends Error implements UseCaseError {
  constructor(reason: string) {
    super(`Catálogo inválido: ${reason}`)
  }
}
