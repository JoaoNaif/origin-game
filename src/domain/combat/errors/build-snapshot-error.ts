import { UseCaseError } from '@/core/errors/use-case-error'

export class BuildSnapshotError extends Error implements UseCaseError {
  constructor(reason: string) {
    super(`Não foi possível montar a batalha: ${reason}`)
  }
}
