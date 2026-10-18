import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import {
  CharacterClass,
  CLASS_BUDGET,
  CLASS_BUDGET_TOLERANCE,
} from '../enums/character-class'
import { DangerLevel } from '../enums/danger-level'
import { Exclusivity } from '../enums/exclusivity'
import { Rarity } from '../enums/rarity'
import { TraitSource } from '../enums/trait-source'
import { InvalidCharacterTemplateError } from '../errors/invalid-character-template-error'
import { Passive } from '../value-objects/passive'
import { StatBlock, statBudget } from '../value-objects/stat-block'
import { Trait } from './trait'
import { Variant } from './variant'

export const MAX_VARIANTS = 3

export interface TemplateVariant {
  variantId: UniqueEntityId
  isPrimary: boolean
}

export interface CharacterTemplateProps {
  key: string
  name: string
  description?: string | null
  characterClass: CharacterClass
  rarity: Rarity
  initialDanger: DangerLevel
  exclusivity: Exclusivity
  /** 0 a 3; sem variante = lista vazia. */
  variants: TemplateVariant[]
  familyTraitId?: UniqueEntityId | null
  /** Perfil no nível 100, já com a distribuição padrão dos pontos livres. */
  stats: StatBlock
  passive: Passive
}

export interface CreateCharacterTemplateInput extends Omit<
  CharacterTemplateProps,
  'familyTraitId' | 'variants'
> {
  /** 0 a 3 variantes base (nunca despertada: o despertar é da instância). */
  variants: { variant: Variant; isPrimary: boolean }[]
  /** Traço de família (precisa ser TEMPLATE). */
  familyTrait?: Trait | null
}

/** Modelo de personagem (catálogo). Igual para todos; o que é do jogador mora em Character. */
export class CharacterTemplate extends Entity<CharacterTemplateProps> {
  get key() {
    return this.props.key
  }

  get name() {
    return this.props.name
  }

  get description() {
    return this.props.description ?? null
  }

  get characterClass() {
    return this.props.characterClass
  }

  get rarity() {
    return this.props.rarity
  }

  get initialDanger() {
    return this.props.initialDanger
  }

  get exclusivity() {
    return this.props.exclusivity
  }

  get variants(): readonly TemplateVariant[] {
    return this.props.variants
  }

  get primaryVariantId() {
    return this.props.variants.find((v) => v.isPrimary)?.variantId ?? null
  }

  get familyTraitId() {
    return this.props.familyTraitId ?? null
  }

  get stats(): Readonly<StatBlock> {
    return this.props.stats
  }

  get passive(): Readonly<Passive> {
    return this.props.passive
  }

  static create(
    input: CreateCharacterTemplateInput,
    id?: UniqueEntityId
  ): Either<InvalidCharacterTemplateError, CharacterTemplate> {
    const { familyTrait, variants: variantInputs, ...rest } = input

    if (variantInputs.some(({ variant }) => variant.isAwakened)) {
      return left(
        new InvalidCharacterTemplateError(
          'modelo não vem com variante despertada (o despertar é da instância)'
        )
      )
    }

    const props = {
      ...rest,
      variants: variantInputs.map(({ variant, isPrimary }) => ({
        variantId: variant.id,
        isPrimary,
      })),
    }

    const variantError = validateVariants(props.variants)
    if (variantError)
      return left(new InvalidCharacterTemplateError(variantError))

    if (familyTrait) {
      if (familyTrait.source !== TraitSource.TEMPLATE) {
        return left(
          new InvalidCharacterTemplateError(
            'traço de família precisa ser TEMPLATE'
          )
        )
      }

      const familyVariantId = familyTrait.variantId
      const hasFamilyVariant =
        !familyVariantId ||
        props.variants.some((v) => v.variantId.equals(familyVariantId))

      if (!hasFamilyVariant) {
        return left(
          new InvalidCharacterTemplateError(
            'o personagem precisa ter a variante da família'
          )
        )
      }
    }

    if (Object.values(props.stats).some((value) => value <= 0)) {
      return left(
        new InvalidCharacterTemplateError('stats precisam ser maiores que zero')
      )
    }

    const budget = statBudget(props.stats)
    const classBudget = CLASS_BUDGET[props.characterClass]
    if (Math.abs(budget - classBudget) > classBudget * CLASS_BUDGET_TOLERANCE) {
      return left(
        new InvalidCharacterTemplateError(
          `orçamento ${budget} fora de ±3% de ${classBudget}`
        )
      )
    }

    if (!props.passive.name || props.passive.effects.length === 0) {
      return left(
        new InvalidCharacterTemplateError('passiva obrigatória, com efeito')
      )
    }

    return right(
      new CharacterTemplate(
        { ...props, familyTraitId: familyTrait?.id ?? null },
        id
      )
    )
  }
}

function validateVariants(variants: TemplateVariant[]): string | null {
  if (variants.length > MAX_VARIANTS) {
    return `no máximo ${MAX_VARIANTS} variantes`
  }

  const ids = new Set(variants.map((v) => v.variantId.toValue()))
  if (ids.size !== variants.length) {
    return 'variante repetida'
  }

  const primaries = variants.filter((v) => v.isPrimary).length
  if (variants.length > 0 && primaries !== 1) {
    return 'precisa de exatamente uma variante principal'
  }

  return null
}
