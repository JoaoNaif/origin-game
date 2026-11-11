import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { AwakeningRequirementLevel } from '@/domain/characters/entities/awakening'
import { Lineage } from '@/domain/characters/enums/lineage'
import { Stat } from '@/domain/characters/enums/stat'
import { KNOWN_TITLES } from '@/domain/characters/services/dom-rules'
import { GearGrade } from '../enums/gear-grade'
import { GearKind } from '../enums/gear-kind'
import { InvalidGearError } from '../errors/invalid-gear-error'
import {
  GEAR_ADMIN_TUNING,
  GEAR_GRADE_ORDER,
  GEAR_LOW_REQUIRED_FROM,
  GEAR_REQUIREMENT_COUNT,
  GEAR_STAT_PERCENTS,
  GEAR_TITLES,
} from '../gear-values'

/** "Stat alto" (entre os 2 maiores) ou "stat baixo" (entre os 2 menores), na régua do despertar (D151). */
export interface GearRequirement {
  stat: Stat
  level: AwakeningRequirementLevel
}

/** Linhagem de um equipamento: sempre a de uma variante (o minério vivo carrega uma variante, nunca none). */
export type GearLineage = Exclude<Lineage, 'NONE'>

export interface GearTemplateProps {
  key: string
  name: string
  description?: string | null
  kind: GearKind
  grade: GearGrade
  lineage: GearLineage
  primaryStat: Stat
  secondaryStat: Stat
  primaryPercent: number
  secondaryPercent: number
  requirements: GearRequirement[]
  /** Títulos que ajudam no elo (D81): cada um vale 1 requisito, com teto de 1. */
  titles: string[]
}

export interface CreateGearTemplateInput extends Omit<
  GearTemplateProps,
  'primaryPercent' | 'secondaryPercent'
> {
  /** Padrão: o do grau (D94). O admin ajusta em até ±15%. */
  primaryPercent?: number
  secondaryPercent?: number
}

/**
 * Modelo de equipamento vivo (catálogo do admin, D62, D94): o grau, a linhagem (a passiva), os 2 stats do bônus, os
 * requisitos do elo e os títulos que ajudam. A conta guarda cópias dele (`Gear`).
 */
export class GearTemplate extends Entity<GearTemplateProps> {
  get key() {
    return this.props.key
  }

  get name() {
    return this.props.name
  }

  get description() {
    return this.props.description ?? null
  }

  get kind() {
    return this.props.kind
  }

  get grade() {
    return this.props.grade
  }

  get lineage() {
    return this.props.lineage
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

  get requirements(): readonly GearRequirement[] {
    return this.props.requirements
  }

  get titles(): readonly string[] {
    return this.props.titles
  }

  /** Divino: só por evento único, vinculado à conta (9.6). */
  get isDivine() {
    return this.props.grade === GearGrade.DIVINE
  }

  static create(
    input: CreateGearTemplateInput,
    id?: UniqueEntityId
  ): Either<InvalidGearError, GearTemplate> {
    const base = GEAR_STAT_PERCENTS[input.grade]
    const props: GearTemplateProps = {
      ...input,
      primaryPercent: input.primaryPercent ?? base?.primary,
      secondaryPercent: input.secondaryPercent ?? base?.secondary,
      requirements: input.requirements.map((r) => ({ ...r })),
      titles: [...input.titles],
    }

    const error = validate(props)
    if (error) return left(new InvalidGearError(error))

    return right(new GearTemplate(props, id))
  }
}

function withinTuning(value: number, base: number): boolean {
  const margin = base * GEAR_ADMIN_TUNING + 1e-9
  return value >= base - margin && value <= base + margin
}

function validate(props: GearTemplateProps): string | null {
  const { grade, requirements, titles } = props

  if (!GEAR_GRADE_ORDER.includes(grade)) return 'grau desconhecido'
  if (!Object.values(GearKind).includes(props.kind)) {
    return 'tipo desconhecido (arma ou armadura)'
  }
  if (
    (props.lineage as Lineage) === Lineage.NONE ||
    !Object.values(Lineage).includes(props.lineage)
  ) {
    return 'a linhagem é a de uma variante (nunca none)'
  }

  if (props.primaryStat === props.secondaryStat) {
    return 'o stat principal e o secundário são diferentes'
  }

  const base = GEAR_STAT_PERCENTS[grade]
  if (
    !withinTuning(props.primaryPercent, base.primary) ||
    !withinTuning(props.secondaryPercent, base.secondary)
  ) {
    return `o bônus do ${grade} é ${base.primary}% e ${base.secondary}%, com ajuste de até ±${GEAR_ADMIN_TUNING * 100}%`
  }

  const count = GEAR_REQUIREMENT_COUNT[grade]
  if (requirements.length !== count) {
    return `o grau ${grade} pede ${count} requisitos`
  }

  if (new Set(requirements.map((r) => r.stat)).size !== requirements.length) {
    return 'stat repetido nos requisitos (nunca o mesmo stat nos dois sentidos)'
  }

  for (const level of Object.values(AwakeningRequirementLevel)) {
    if (requirements.filter((r) => r.level === level).length > 2) {
      return `no máximo 2 requisitos ${level === 'HIGH' ? 'altos' : 'baixos'} (alto e baixo são os 2 maiores e os 2 menores)`
    }
  }

  const needsLow =
    GEAR_GRADE_ORDER.indexOf(grade) >=
    GEAR_GRADE_ORDER.indexOf(GEAR_LOW_REQUIRED_FROM)
  if (needsLow && !requirements.some((r) => r.level === 'LOW')) {
    return 'do Mestre para cima, pelo menos 1 requisito "baixo"'
  }

  if (titles.length < GEAR_TITLES.min || titles.length > GEAR_TITLES.max) {
    return `de ${GEAR_TITLES.min} a ${GEAR_TITLES.max} títulos`
  }

  const unknown = titles.filter((t) => !KNOWN_TITLES.includes(t))
  if (unknown.length > 0) {
    return `título desconhecido: ${unknown.join(', ')} (hoje: ${KNOWN_TITLES.join(', ')})`
  }
  if (new Set(titles).size !== titles.length) return 'título repetido'

  return null
}
