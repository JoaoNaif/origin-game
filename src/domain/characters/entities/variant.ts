import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Lineage } from '../enums/lineage'
import { InvalidVariantLineageError } from '../errors/invalid-variant-lineage-error'
import { InvalidAwakenedVariantError } from '../errors/invalid-awakened-variant-error'

export interface VariantProps {
  key: string
  name: string
  lineage: Lineage
  description?: string | null
  /** Variante base de que esta evolui (despertar, D67). Nulo = variante base. */
  awakensFromId?: UniqueEntityId | null
}

export interface CreateVariantInput extends Omit<
  VariantProps,
  'awakensFromId'
> {
  /** Variante base, quando esta é despertada (ex.: fogo azul evolui de fogo). */
  awakensFrom?: Variant | null
}

/** Variante (ex.: fogo). "Sem variante" não é uma Variant: o personagem não tem nenhuma ligada. */
export class Variant extends Entity<VariantProps> {
  get key() {
    return this.props.key
  }

  get name() {
    return this.props.name
  }

  get lineage() {
    return this.props.lineage
  }

  get description() {
    return this.props.description ?? null
  }

  get awakensFromId() {
    return this.props.awakensFromId ?? null
  }

  /** É uma variante despertada (evolução de outra). */
  get isAwakened() {
    return this.awakensFromId !== null
  }

  static create(
    input: CreateVariantInput,
    id?: UniqueEntityId
  ): Either<InvalidVariantLineageError | InvalidAwakenedVariantError, Variant> {
    const { awakensFrom, ...props } = input

    if (props.lineage === Lineage.NONE) {
      return left(new InvalidVariantLineageError())
    }

    if (awakensFrom) {
      if (awakensFrom.isAwakened) {
        return left(
          new InvalidAwakenedVariantError(
            'uma despertada não pode ser base de outra (um despertar só)'
          )
        )
      }

      if (awakensFrom.lineage !== props.lineage) {
        return left(
          new InvalidAwakenedVariantError(
            'a despertada tem a mesma linhagem da base'
          )
        )
      }
    }

    return right(
      new Variant({ ...props, awakensFromId: awakensFrom?.id ?? null }, id)
    )
  }
}
