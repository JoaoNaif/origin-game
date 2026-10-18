import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Variant } from '@/domain/characters/entities/variant'
import { CharacterClass } from '@/domain/characters/enums/character-class'
import { Lineage } from '@/domain/characters/enums/lineage'
import { SkillArea } from '../enums/skill-area'
import { SkillKitSlot } from '../enums/skill-kit-slot'
import { SkillRange } from '../enums/skill-range'
import { SkillTarget } from '../enums/skill-target'
import {
  AWAKENED_MIN_LEVEL,
  MAX_SKILL_POWER,
  SKILL_TIER_REFERENCE,
  SkillTier,
} from '../enums/skill-tier'
import { InvalidSkillError } from '../errors/invalid-skill-error'
import { SkillEffect } from '../value-objects/skill-effect'

export interface SkillProps {
  key: string
  name: string
  description?: string | null
  /** Nulo = skill none (de quem não tem variante; linhagem NONE). */
  variantId?: UniqueEntityId | null
  /** Linhagem da skill (da variante, ou NONE). Guardada para o motor não precisar buscar a variante. */
  lineage: Lineage
  /** A variante da skill é despertada (Desgaste ×1,5 e desconto nas demais, D96). */
  isAwakened: boolean
  tier: SkillTier
  target: SkillTarget
  range?: SkillRange | null
  area: SkillArea
  cooldown: number
  desgastePercent: number
  /** Nulo = sem teste de acerto (aliado ou si mesmo: cobra sempre). */
  baseHitChance?: number | null
  minLevel: number
  kitClass?: CharacterClass | null
  kitSlot?: SkillKitSlot | null
  effects: SkillEffect[]
}

export interface CreateSkillInput extends Omit<
  SkillProps,
  'variantId' | 'lineage' | 'isAwakened'
> {
  /** Variante da skill; nulo = skill none. */
  variant?: Variant | null
}

const POWER_EFFECTS = new Set(['DAMAGE', 'HEAL', 'SHIELD'])

/** Skill do catálogo. Os números são os valores finais (o admin pode fugir da referência, D16). */
export class Skill extends Entity<SkillProps> {
  get key() {
    return this.props.key
  }

  get name() {
    return this.props.name
  }

  get description() {
    return this.props.description ?? null
  }

  get variantId() {
    return this.props.variantId ?? null
  }

  get lineage() {
    return this.props.lineage
  }

  get isNone() {
    return this.props.lineage === Lineage.NONE
  }

  get isAwakened() {
    return this.props.isAwakened
  }

  get tier() {
    return this.props.tier
  }

  get target() {
    return this.props.target
  }

  get range() {
    return this.props.range ?? null
  }

  get area() {
    return this.props.area
  }

  get cooldown() {
    return this.props.cooldown
  }

  get desgastePercent() {
    return this.props.desgastePercent
  }

  get baseHitChance() {
    return this.props.baseHitChance ?? null
  }

  get minLevel() {
    return this.props.minLevel
  }

  get kitClass() {
    return this.props.kitClass ?? null
  }

  get kitSlot() {
    return this.props.kitSlot ?? null
  }

  get isKit() {
    return this.kitClass !== null
  }

  get effects(): readonly SkillEffect[] {
    return this.props.effects
  }

  static create(
    input: CreateSkillInput,
    id?: UniqueEntityId
  ): Either<InvalidSkillError, Skill> {
    const { variant, ...props } = input
    const isAwakened = variant?.isAwakened ?? false

    const error = validate(props, isAwakened)
    if (error) return left(new InvalidSkillError(error))

    return right(
      new Skill(
        {
          ...props,
          variantId: variant?.id ?? null,
          lineage: variant?.lineage ?? Lineage.NONE,
          isAwakened,
          range: props.range ?? null,
          baseHitChance: props.baseHitChance ?? null,
          kitClass: props.kitClass ?? null,
          kitSlot: props.kitSlot ?? null,
        },
        id
      )
    )
  }
}

function validate(
  props: Omit<CreateSkillInput, 'variant'>,
  isAwakened: boolean
): string | null {
  // 1. efeitos
  if (props.effects.length === 0) return 'precisa de pelo menos 1 efeito'

  // 2. alvo, alcance e acerto
  const hasRange = props.range != null
  const hasHitChance = props.baseHitChance != null

  if (props.target === SkillTarget.ENEMY) {
    if (!hasRange) return 'skill em inimigo precisa de alcance'
    if (!hasHitChance) return 'skill em inimigo precisa de chance de acerto'
  } else {
    if (hasRange) return 'skill em aliado ou si mesmo não tem alcance'
    if (hasHitChance)
      return 'skill em aliado ou si mesmo não tem teste de acerto'
  }

  if (props.target === SkillTarget.SELF && props.area !== SkillArea.SINGLE) {
    return 'skill em si mesmo é sempre de alvo único'
  }

  // 3. nível mínimo
  if (props.minLevel < 0 || props.minLevel > 100) {
    return 'nível mínimo entre 0 e 100'
  }

  if (props.minLevel < SKILL_TIER_REFERENCE[props.tier].minLevel) {
    return `nível mínimo abaixo do tipo ${props.tier}`
  }

  if (isAwakened && props.minLevel < AWAKENED_MIN_LEVEL) {
    return `skill despertada tem nível mínimo de pelo menos ${AWAKENED_MIN_LEVEL}`
  }

  // 4. números
  if (!Number.isInteger(props.cooldown) || props.cooldown < 0) {
    return 'cooldown inteiro e não negativo'
  }

  if (props.desgastePercent < 0) return 'Desgaste não negativo'

  if (hasHitChance && !isProbability(props.baseHitChance!)) {
    return 'chance de acerto entre 0 e 1'
  }

  for (const effect of props.effects) {
    if (POWER_EFFECTS.has(effect.type)) {
      const power = (effect as { power: number }).power
      if (power <= 0 || power > MAX_SKILL_POWER) {
        return `Poder entre 0 e ${MAX_SKILL_POWER}`
      }
    }

    if (effect.type === 'APPLY_STATUS' && !isProbability(effect.baseChance)) {
      return 'chance de status entre 0 e 1'
    }

    if ('duration' in effect && effect.duration < 1) {
      return 'duração de pelo menos 1'
    }
  }

  // 5. kit básico
  const hasKitClass = props.kitClass != null
  const hasKitSlot = props.kitSlot != null

  if (hasKitClass !== hasKitSlot) return 'kitClass e kitSlot andam juntos'
  if (hasKitClass && props.minLevel !== 0)
    return 'skill de kit tem nível mínimo 0'
  if (hasKitClass && isAwakened) return 'skill despertada não entra no kit'

  return null
}

function isProbability(value: number) {
  return value > 0 && value <= 1
}
