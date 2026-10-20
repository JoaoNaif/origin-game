import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Trait } from '@/domain/characters/entities/trait'
import { Stat } from '@/domain/characters/enums/stat'
import { InvalidBattleFieldError } from '../errors/invalid-battle-field-error'

/** Bônus de referência do campo (D98): +6% em um stat e +4% em outro. */
export const FIELD_PRIMARY_PERCENT = 6
export const FIELD_SECONDARY_PERCENT = 4

export const MIN_FIELD_TRAITS = 2
export const MAX_FIELD_TRAITS = 4

export interface BattleFieldProps {
  key: string
  name: string
  description?: string | null
  /** Quem tem **qualquer um** destes traços recebe o bônus (D98). */
  requiredTraitIds: UniqueEntityId[]
  primaryStat: Stat
  secondaryStat: Stat
  primaryPercent: number
  secondaryPercent: number
}

export interface CreateBattleFieldInput extends Omit<
  BattleFieldProps,
  'requiredTraitIds' | 'primaryPercent' | 'secondaryPercent'
> {
  requiredTraits: Trait[]
  /** Padrão: 6 (D98). O admin pode ajustar. */
  primaryPercent?: number
  /** Padrão: 4 (D98). */
  secondaryPercent?: number
}

/**
 * Campo de batalha (catálogo do admin; no MVP vem do seed.ts). D28, D40, D98: dá um bônus de status, nos dois lados, a
 * quem tem qualquer um dos traços pedidos. Nunca é bônus por variante.
 */
export class BattleField extends Entity<BattleFieldProps> {
  get key() {
    return this.props.key
  }

  get name() {
    return this.props.name
  }

  get description() {
    return this.props.description ?? null
  }

  get requiredTraitIds(): readonly UniqueEntityId[] {
    return this.props.requiredTraitIds
  }

  get primaryStat() {
    return this.props.primaryStat
  }

  get secondaryStat() {
    return this.props.secondaryStat
  }

  get primaryPercent() {
    return this.props.primaryPercent
  }

  get secondaryPercent() {
    return this.props.secondaryPercent
  }

  static create(
    input: CreateBattleFieldInput,
    id?: UniqueEntityId
  ): Either<InvalidBattleFieldError, BattleField> {
    const traits = input.requiredTraits

    if (traits.length < MIN_FIELD_TRAITS || traits.length > MAX_FIELD_TRAITS) {
      return left(
        new InvalidBattleFieldError(
          `de ${MIN_FIELD_TRAITS} a ${MAX_FIELD_TRAITS} traços exigidos`
        )
      )
    }

    if (new Set(traits.map((t) => t.id.toValue())).size !== traits.length) {
      return left(new InvalidBattleFieldError('traço repetido'))
    }

    if (new Set(traits.map((t) => t.category)).size < 2) {
      return left(
        new InvalidBattleFieldError(
          'traços de pelo menos 2 categorias diferentes'
        )
      )
    }

    if (input.primaryStat === input.secondaryStat) {
      return left(
        new InvalidBattleFieldError('stat principal e secundário diferentes')
      )
    }

    const primaryPercent = input.primaryPercent ?? FIELD_PRIMARY_PERCENT
    const secondaryPercent = input.secondaryPercent ?? FIELD_SECONDARY_PERCENT
    if (primaryPercent <= 0 || secondaryPercent <= 0) {
      return left(new InvalidBattleFieldError('bônus maior que zero'))
    }

    return right(
      new BattleField(
        {
          key: input.key,
          name: input.name,
          description: input.description ?? null,
          requiredTraitIds: traits.map((t) => t.id),
          primaryStat: input.primaryStat,
          secondaryStat: input.secondaryStat,
          primaryPercent,
          secondaryPercent,
        },
        id
      )
    )
  }
}
