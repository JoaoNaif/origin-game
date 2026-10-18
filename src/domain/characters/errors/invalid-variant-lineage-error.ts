import { UseCaseError } from '@/core/errors/use-case-error'

export class InvalidVariantLineageError extends Error implements UseCaseError {
  constructor() {
    super('Uma variante não pode ter linhagem NONE.')
  }
}
