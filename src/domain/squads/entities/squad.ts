import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Account } from '@/domain/accounts/entities/account'
import { Character } from '@/domain/characters/entities/character'
import { InvalidSquadError } from '../errors/invalid-squad-error'
import {
  GridPosition,
  isInsideGrid,
  positionKey,
} from '../value-objects/grid-position'

/** 4 personagens por jogador (D11). */
export const SQUAD_SIZE = 4

const NAME_MIN = 1
const NAME_MAX = 30

export interface SquadMember extends GridPosition {
  characterId: UniqueEntityId
}

export interface SquadProps {
  accountId: UniqueEntityId
  name: string
  members: SquadMember[]
}

export interface SquadMemberInput extends GridPosition {
  character: Character
}

export interface CreateSquadInput {
  account: Account
  name: string
  members: SquadMemberInput[]
}

/** Formação salva da conta: 4 personagens dela em células da grade 3x3 (D11, D35). */
export class Squad extends Entity<SquadProps> {
  get accountId() {
    return this.props.accountId
  }

  get name() {
    return this.props.name
  }

  get members(): readonly SquadMember[] {
    return this.props.members
  }

  static create(
    input: CreateSquadInput,
    id?: UniqueEntityId
  ): Either<InvalidSquadError, Squad> {
    const name = input.name.trim()
    if (name.length < NAME_MIN || name.length > NAME_MAX) {
      return left(
        new InvalidSquadError(`nome com ${NAME_MIN} a ${NAME_MAX} caracteres`)
      )
    }

    const error = validateMembers(input.account.id, input.members)
    if (error) return left(new InvalidSquadError(error))

    return right(
      new Squad(
        {
          accountId: input.account.id,
          name,
          members: input.members.map(toMember),
        },
        id
      )
    )
  }

  /** Recompõe um squad já existente (ex.: vindo do banco), sem as regras de criação. */
  static restore(props: SquadProps, id: UniqueEntityId): Squad {
    return new Squad(props, id)
  }

  /** Troca a formação inteira (personagens e células) fora da batalha. */
  setFormation(members: SquadMemberInput[]): Either<InvalidSquadError, void> {
    const error = validateMembers(this.props.accountId, members)
    if (error) return left(new InvalidSquadError(error))

    this.props.members = members.map(toMember)

    return right(undefined)
  }
}

function toMember({ character, row, column }: SquadMemberInput): SquadMember {
  return { characterId: character.id, row, column }
}

function validateMembers(
  accountId: UniqueEntityId,
  members: SquadMemberInput[]
): string | null {
  if (members.length !== SQUAD_SIZE) {
    return `o squad tem ${SQUAD_SIZE} personagens`
  }

  if (members.some(({ character }) => !character.accountId.equals(accountId))) {
    return 'só personagens da própria conta'
  }

  const characters = new Set(members.map((m) => m.character.id.toValue()))
  if (characters.size !== members.length) {
    return 'personagem repetido'
  }

  if (members.some((m) => !isInsideGrid(m))) {
    return 'célula fora da grade 3x3'
  }

  const cells = new Set(members.map(positionKey))
  if (cells.size !== members.length) {
    return 'dois personagens na mesma célula'
  }

  return null
}
