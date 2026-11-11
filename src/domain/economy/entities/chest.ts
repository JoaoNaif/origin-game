import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Rarity } from '@/domain/characters/enums/rarity'
import { ChestSource } from '../enums/chest-source'
import { InvalidEconomyActionError } from '../errors/invalid-economy-action-error'
import { Fragments } from '../value-objects/fragments'

/** O que saiu do baú (D150, D153): 1 item da raridade sorteada (personagem ou equipamento) e os fragmentos. */
export interface ChestContents {
  /** Raridade sorteada para o item (tabela de 3.5). */
  rarity: Rarity
  /** Personagem novo que entrou no Elenco. */
  character: { templateKey: string; characterId: string } | null
  /** Personagem repetido, que virou moeda (D82). */
  convertedTemplateKey: string | null
  /** Equipamento novo que entrou no inventário (D153; ausente nos baús abertos antes do equipamento vivo). */
  gear?: { templateKey: string; gearId: string } | null
  /** Equipamento que não coube no inventário e virou moeda. */
  convertedGearKey?: string | null
  /** Moeda: o valor do repetido ou da raridade sem personagem no catálogo (3.3). */
  coins: number
  fragments: Fragments
}

export interface ChestProps {
  accountId: UniqueEntityId
  /** Nível do baú, na escala de raridade (D86). */
  tier: Rarity
  source: ChestSource
  /** Batalha em que caiu (baú de batalha). */
  battleId: UniqueEntityId | null
  createdAt: Date
  openedAt: Date | null
  contents: ChestContents | null
}

export interface CreateChestInput {
  accountId: UniqueEntityId
  tier: Rarity
  source: ChestSource
  battleId?: UniqueEntityId | null
  createdAt: Date
}

/** Baú da conta (D79): fica fechado até o jogador abrir; abre uma vez só. */
export class Chest extends Entity<ChestProps> {
  get accountId() {
    return this.props.accountId
  }

  get tier() {
    return this.props.tier
  }

  get source() {
    return this.props.source
  }

  get battleId() {
    return this.props.battleId
  }

  get createdAt() {
    return this.props.createdAt
  }

  get openedAt() {
    return this.props.openedAt
  }

  get contents() {
    return this.props.contents
  }

  get isOpened() {
    return this.props.openedAt !== null
  }

  static create(input: CreateChestInput, id?: UniqueEntityId): Chest {
    return new Chest(
      {
        accountId: input.accountId,
        tier: input.tier,
        source: input.source,
        battleId: input.battleId ?? null,
        createdAt: input.createdAt,
        openedAt: null,
        contents: null,
      },
      id
    )
  }

  static restore(props: ChestProps, id: UniqueEntityId): Chest {
    return new Chest(props, id)
  }

  open(
    contents: ChestContents,
    openedAt: Date
  ): Either<InvalidEconomyActionError, void> {
    if (this.isOpened) {
      return left(new InvalidEconomyActionError('o baú já foi aberto'))
    }

    this.props.contents = contents
    this.props.openedAt = openedAt

    return right(undefined)
  }
}
