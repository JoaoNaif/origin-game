import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { TraitCategory } from '../enums/trait-category'
import { TraitSource } from '../enums/trait-source'
import { InvalidTraitError } from '../errors/invalid-trait-error'
import { TraitEffect } from '../value-objects/trait-effect'

export interface TraitProps {
  key: string
  name: string
  description?: string | null
  category: TraitCategory
  source: TraitSource
  /** Só vale para esta variante (traços de família). */
  variantId?: UniqueEntityId | null
  effects: TraitEffect[]
}

/** Traço do catálogo (D27, D39, D47). Ocupa 1 dos 5 slots do personagem, inclusive o de família. */
export class Trait extends Entity<TraitProps> {
  get key() {
    return this.props.key
  }

  get name() {
    return this.props.name
  }

  get description() {
    return this.props.description ?? null
  }

  get category() {
    return this.props.category
  }

  get source() {
    return this.props.source
  }

  get variantId() {
    return this.props.variantId ?? null
  }

  get effects(): readonly TraitEffect[] {
    return this.props.effects
  }

  static create(
    props: TraitProps,
    id?: UniqueEntityId
  ): Either<InvalidTraitError, Trait> {
    if (props.effects.length === 0) {
      return left(new InvalidTraitError('precisa de pelo menos 1 efeito'))
    }

    if (
      props.source === TraitSource.TEMPLATE &&
      props.category !== TraitCategory.ORIGIN
    ) {
      return left(
        new InvalidTraitError('traço TEMPLATE é sempre da categoria ORIGIN')
      )
    }

    if (props.variantId && props.source !== TraitSource.TEMPLATE) {
      return left(
        new InvalidTraitError('traço ligado a uma variante é sempre TEMPLATE')
      )
    }

    return right(new Trait(props, id))
  }
}
