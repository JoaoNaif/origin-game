import { UseCaseError } from '@/core/errors/use-case-error'

/** A senha atual não confere ao trocar a senha (com o usuário já logado; não é falha de login). */
export class WrongPasswordError extends Error implements UseCaseError {
  constructor() {
    super('Senha atual errada.')
  }
}
