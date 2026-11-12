import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { BUILD_SIZE } from '@/domain/characters/services/basic-kit'
import { BeastSource } from '../enums/beast-source'
import { InvalidBeastError } from '../errors/invalid-beast-error'

export interface BeastProps {
  accountId: UniqueEntityId
  templateId: UniqueEntityId
  /** Personagem com quem firmou o contrato; nulo = no inventário, ainda sem contrato. */
  characterId: UniqueEntityId | null
  /** Slot da build (1 a 4) que a invocação ocupa (D43, D154). */
  slot: number | null
  source: BeastSource
  acquiredAt: Date
}

export interface CreateBeastInput {
  accountId: UniqueEntityId
  templateId: UniqueEntityId
  source: BeastSource
  acquiredAt: Date
}

const isSlot = (slot: number) =>
  Number.isInteger(slot) && slot >= 1 && slot <= BUILD_SIZE

/**
 * Besta da conta (D64): ocupa 1 espaço do inventário (D100). O contrato a liga a um personagem e põe a invocação num
 * slot da build. Contrato desfeito = besta perdida (`progression_brief.md` 2.5): não volta ao inventário.
 */
export class Beast extends Entity<BeastProps> {
  get accountId() {
    return this.props.accountId
  }

  get templateId() {
    return this.props.templateId
  }

  get characterId() {
    return this.props.characterId
  }

  get slot() {
    return this.props.slot
  }

  get hasContract() {
    return this.props.characterId !== null
  }

  get source() {
    return this.props.source
  }

  get acquiredAt() {
    return this.props.acquiredAt
  }

  static create(input: CreateBeastInput, id?: UniqueEntityId): Beast {
    return new Beast({ ...input, characterId: null, slot: null }, id)
  }

  static restore(props: BeastProps, id: UniqueEntityId): Beast {
    return new Beast(props, id)
  }

  /** Firma o contrato com um personagem da conta, com a invocação no slot dado. Uma vez só. */
  contractWith(
    characterAccountId: UniqueEntityId,
    characterId: UniqueEntityId,
    slot: number
  ): Either<InvalidBeastError, void> {
    if (!characterAccountId.equals(this.props.accountId)) {
      return left(new InvalidBeastError('o personagem é de outra conta'))
    }
    if (this.hasContract) {
      return left(
        new InvalidBeastError(
          'a besta já tem contrato (desfazer o contrato perde a besta)'
        )
      )
    }
    if (!isSlot(slot)) {
      return left(new InvalidBeastError(`slot da build de 1 a ${BUILD_SIZE}`))
    }

    this.props.characterId = characterId
    this.props.slot = slot

    return right(undefined)
  }

  /** Troca o slot da build que a invocação ocupa (decisão de build, fora da batalha). */
  moveToSlot(slot: number): Either<InvalidBeastError, void> {
    if (!this.hasContract) {
      return left(new InvalidBeastError('a besta ainda não tem contrato'))
    }
    if (!isSlot(slot)) {
      return left(new InvalidBeastError(`slot da build de 1 a ${BUILD_SIZE}`))
    }

    this.props.slot = slot

    return right(undefined)
  }
}
