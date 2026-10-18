import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { InvalidAccountError } from '../errors/invalid-account-error'

export interface AccountProps {
  username: string
  displayName: string
}

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/
const DISPLAY_NAME_MIN = 2
const DISPLAY_NAME_MAX = 30

/**
 * Conta do jogador (mínima no MVP): dona dos personagens e dos squads.
 * E-mail e senha entram com a autenticação; moeda, inventário, organização e ranking com as suas camadas.
 */
export class Account extends Entity<AccountProps> {
  get username() {
    return this.props.username
  }

  get displayName() {
    return this.props.displayName
  }

  /** Normaliza o username (sem espaços nas pontas, minúsculo) antes de validar. */
  static normalizeUsername(username: string) {
    return username.trim().toLowerCase()
  }

  static create(
    props: AccountProps,
    id?: UniqueEntityId
  ): Either<InvalidAccountError, Account> {
    const username = Account.normalizeUsername(props.username)
    const displayName = props.displayName.trim()

    if (!USERNAME_PATTERN.test(username)) {
      return left(
        new InvalidAccountError(
          'username com 3 a 20 caracteres: letras minúsculas, números e _'
        )
      )
    }

    if (
      displayName.length < DISPLAY_NAME_MIN ||
      displayName.length > DISPLAY_NAME_MAX
    ) {
      return left(
        new InvalidAccountError(
          `nome exibido com ${DISPLAY_NAME_MIN} a ${DISPLAY_NAME_MAX} caracteres`
        )
      )
    }

    return right(new Account({ username, displayName }, id))
  }
}
