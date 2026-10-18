import { UseCaseError } from '@/core/errors/use-case-error'

export class InvalidSkillError extends Error implements UseCaseError {
  constructor(reason: string) {
    super(`Skill inválida: ${reason}`)
  }
}
