import { UseCaseError } from '@/core/errors/use-case-error'

/** Mesmo erro para username e senha: não revela se a conta existe. */
export class WrongCredentialsError extends Error implements UseCaseError {
  constructor() {
    super('Username ou senha inválidos.')
  }
}
