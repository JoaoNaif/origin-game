import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { AccountRole } from '../enums/account-role'
import { InvalidAccountError } from '../errors/invalid-account-error'

export interface AccountProps {
  username: string
  displayName: string
  /** Hash da senha (nunca a senha). Quem gera é a porta `HashGenerator`. */
  passwordHash: string
  /** Padrão: jogador. */
  role: AccountRole
}

const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/
const DISPLAY_NAME_MIN = 2
const DISPLAY_NAME_MAX = 30

/** Senha em texto (antes do hash): 8 a 72 caracteres (o bcrypt ignora o que passa de 72 bytes). */
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 72

/**
 * Conta do jogador: dona dos personagens e dos squads. Entra pelo username + senha (`data_model.md` 3.5);
 * moeda, inventário, organização e ranking chegam com as suas camadas.
 */
export class Account extends Entity<AccountProps> {
  get username() {
    return this.props.username
  }

  get displayName() {
    return this.props.displayName
  }

  get passwordHash() {
    return this.props.passwordHash
  }

  get role() {
    return this.props.role
  }

  get isAdmin() {
    return this.props.role === AccountRole.ADMIN
  }

  /** Normaliza o username (sem espaços nas pontas, minúsculo) antes de validar. */
  static normalizeUsername(username: string) {
    return username.trim().toLowerCase()
  }

  /** Regra da senha em texto, conferida antes de gerar o hash. `null` = válida. */
  static passwordError(password: string): InvalidAccountError | null {
    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
      return new InvalidAccountError(
        `senha com ${PASSWORD_MIN} a ${PASSWORD_MAX} caracteres`
      )
    }

    return null
  }

  static create(
    props: Omit<AccountProps, 'role'> & { role?: AccountRole },
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

    if (!props.passwordHash) {
      return left(new InvalidAccountError('senha obrigatória'))
    }

    return right(
      new Account(
        {
          username,
          displayName,
          passwordHash: props.passwordHash,
          role: props.role ?? AccountRole.PLAYER,
        },
        id
      )
    )
  }
}
