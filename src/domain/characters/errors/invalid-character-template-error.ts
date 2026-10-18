import { UseCaseError } from '@/core/errors/use-case-error'

export class InvalidCharacterTemplateError
  extends Error
  implements UseCaseError
{
  constructor(reason: string) {
    super(`Modelo de personagem inválido: ${reason}`)
  }
}
