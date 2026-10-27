import { UseCaseError } from '@/core/errors/use-case-error'

export class ResourceInUseError extends Error implements UseCaseError {
  constructor(identifier: string, usedBy: readonly string[] = []) {
    super(
      usedBy.length > 0
        ? `Em uso: ${identifier} (${usedBy.join(', ')}).`
        : `Em uso: ${identifier}.`
    )
  }
}
