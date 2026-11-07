import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import {
  AWAKENING_MISSION_KINDS,
  AwakeningMissionCategory,
  AwakeningMissionKind,
} from '../enums/awakening-mission-kind'
import { Stat } from '../enums/stat'
import { InvalidAwakeningError } from '../errors/invalid-awakening-error'
import { Variant } from './variant'

/** "Stat alto" ou "stat baixo" no perfil do despertar (`awakening_brief.md` 3.1, D151). */
export const AwakeningRequirementLevel = {
  HIGH: 'HIGH',
  LOW: 'LOW',
} as const

export type AwakeningRequirementLevel =
  (typeof AwakeningRequirementLevel)[keyof typeof AwakeningRequirementLevel]

export interface AwakeningRequirement {
  stat: Stat
  level: AwakeningRequirementLevel
}

/** Um modelo de missão do pool do despertar: o tipo e o limiar. */
export interface AwakeningMissionTemplate {
  kind: AwakeningMissionKind
  threshold: number
}

/** O perfil tem de 2 a 3 requisitos (D67). */
export const AWAKENING_REQUIREMENTS = { min: 2, max: 3 } as const

/** Alto = entre os 2 maiores; baixo = entre os 2 menores: mais de 2 de um lado nunca seria cumprido. */
export const MAX_REQUIREMENTS_PER_LEVEL = 2

export interface AwakeningProps {
  key: string
  name: string
  description?: string | null
  /** A variante despertada que ele dá. */
  variantId: UniqueEntityId
  /** A variante base de que ela evolui (quem pode sortear este despertar). */
  baseVariantId: UniqueEntityId
  requirements: AwakeningRequirement[]
  missions: AwakeningMissionTemplate[]
}

export interface CreateAwakeningInput extends Omit<
  AwakeningProps,
  'variantId' | 'baseVariantId'
> {
  variant: Variant
}

/**
 * Despertar do catálogo (admin, D151): a variante despertada, o perfil do sorteio e o pool de missões ocultas. Uma
 * variante base pode ter vários (o sorteio escolhe um, D67).
 */
export class Awakening extends Entity<AwakeningProps> {
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
    return this.props.variantId
  }

  get baseVariantId() {
    return this.props.baseVariantId
  }

  get requirements(): readonly AwakeningRequirement[] {
    return this.props.requirements
  }

  get missions(): readonly AwakeningMissionTemplate[] {
    return this.props.missions
  }

  static create(
    input: CreateAwakeningInput,
    id?: UniqueEntityId
  ): Either<InvalidAwakeningError, Awakening> {
    const { variant, ...props } = input

    const error = validate(input)
    if (error) return left(new InvalidAwakeningError(error))

    return right(
      new Awakening(
        {
          ...props,
          requirements: props.requirements.map((r) => ({ ...r })),
          missions: props.missions.map((m) => ({ ...m })),
          variantId: variant.id,
          baseVariantId: variant.awakensFromId!,
        },
        id
      )
    )
  }
}

function validate(input: CreateAwakeningInput): string | null {
  if (!input.variant.isAwakened) {
    return 'a variante precisa ser despertada (com variante base)'
  }

  const { requirements, missions } = input
  if (
    requirements.length < AWAKENING_REQUIREMENTS.min ||
    requirements.length > AWAKENING_REQUIREMENTS.max
  ) {
    return `o perfil tem de ${AWAKENING_REQUIREMENTS.min} a ${AWAKENING_REQUIREMENTS.max} requisitos`
  }

  if (new Set(requirements.map((r) => r.stat)).size !== requirements.length) {
    return 'stat repetido no perfil'
  }

  for (const level of Object.values(AwakeningRequirementLevel)) {
    if (
      requirements.filter((r) => r.level === level).length >
      MAX_REQUIREMENTS_PER_LEVEL
    ) {
      return `no máximo ${MAX_REQUIREMENTS_PER_LEVEL} requisitos ${level === 'HIGH' ? 'altos' : 'baixos'}`
    }
  }

  if (missions.some((m) => !(m.kind in AWAKENING_MISSION_KINDS))) {
    return 'tipo de missão desconhecido'
  }

  if (new Set(missions.map((m) => m.kind)).size !== missions.length) {
    return 'tipo de missão repetido no pool'
  }

  if (missions.some((m) => !Number.isInteger(m.threshold) || m.threshold < 1)) {
    return 'o limiar da missão é um inteiro de pelo menos 1'
  }

  for (const category of Object.values(AwakeningMissionCategory)) {
    if (
      !missions.some(
        (m) => AWAKENING_MISSION_KINDS[m.kind].category === category
      )
    ) {
      return 'o pool precisa de ao menos uma missão de cada categoria'
    }
  }

  return null
}
