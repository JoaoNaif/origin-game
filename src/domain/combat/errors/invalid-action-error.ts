import { UseCaseError } from '@/core/errors/use-case-error'
import { RuleError } from '@/core/errors/rule-error'

export class InvalidActionError extends RuleError implements UseCaseError {
  constructor(reason: string) {
    super(`Ação inválida: ${reason}`)
  }
}
