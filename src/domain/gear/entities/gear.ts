import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { GearSource } from '../enums/gear-source'
import { InvalidGearError } from '../errors/invalid-gear-error'

export interface GearProps {
  accountId: UniqueEntityId
  templateId: UniqueEntityId
  /** Personagem que está usando (um slot por personagem, D94); nulo = guardado no inventário. */
  characterId: UniqueEntityId | null
  source: GearSource
  acquiredAt: Date
}

export interface CreateGearInput {
  accountId: UniqueEntityId
  templateId: UniqueEntityId
  source: GearSource
  acquiredAt: Date
}

/**
 * Equipamento vivo da conta (D62): mora no inventário (ocupa 1 espaço, D100) e pode estar no slot de um personagem. O
 * elo é calculado na hora, pelo personagem que usa (nunca guardado: os pontos livres mudam).
 */
export class Gear extends Entity<GearProps> {
  get accountId() {
    return this.props.accountId
  }

  get templateId() {
    return this.props.templateId
  }

  get characterId() {
    return this.props.characterId
  }

  get isEquipped() {
    return this.props.characterId !== null
  }

  get source() {
    return this.props.source
  }

  get acquiredAt() {
    return this.props.acquiredAt
  }

  static create(input: CreateGearInput, id?: UniqueEntityId): Gear {
    return new Gear({ ...input, characterId: null }, id)
  }

  static restore(props: GearProps, id: UniqueEntityId): Gear {
    return new Gear(props, id)
  }

  /** Coloca no slot do personagem (da mesma conta). Quem chama tira o que estava no slot antes. */
  equipOn(
    characterAccountId: UniqueEntityId,
    characterId: UniqueEntityId
  ): Either<InvalidGearError, void> {
    if (!characterAccountId.equals(this.props.accountId)) {
      return left(new InvalidGearError('o personagem é de outra conta'))
    }

    this.props.characterId = characterId

    return right(undefined)
  }

  unequip() {
    this.props.characterId = null
  }
}
