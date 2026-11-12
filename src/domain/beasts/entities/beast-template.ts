import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { AwakeningRequirementLevel } from '@/domain/characters/entities/awakening'
import { Lineage } from '@/domain/characters/enums/lineage'
import { KNOWN_TITLES } from '@/domain/characters/services/dom-rules'
import { GearRequirement } from '@/domain/gear/entities/gear-template'
import { Skill } from '@/domain/skills/entities/skill'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import {
  SKILL_TIER_REFERENCE,
  SkillTier,
} from '@/domain/skills/enums/skill-tier'
import { SkillEffect } from '@/domain/skills/value-objects/skill-effect'
import {
  BEAST_GRADE_ORDER,
  BEAST_SKILL_COUNT,
  MASTER_LOW_REQUIRED_FROM,
  MASTER_REQUIREMENT_COUNT,
} from '../beast-values'
import { BeastContract } from '../enums/beast-contract'
import { BeastGrade } from '../enums/beast-grade'
import { InvalidBeastError } from '../errors/invalid-beast-error'

/** Linhagem da besta: a da variante dela (animal com variante, nunca none). */
export type BeastLineage = Exclude<Lineage, 'NONE'>

/** Skill da besta em campo (D154): o formato da skill do catálogo, sem Desgaste, nível e kit. */
export interface BeastSkill {
  name: string
  description?: string | null
  tier: SkillTier
  target: SkillTarget
  range?: SkillRange | null
  area: SkillArea
  cooldown: number
  baseHitChance?: number | null
  effects: SkillEffect[]
}

/** Efeitos que a besta não usa: ela não tem Desgaste para recuperar nem troca o campo. */
const FORBIDDEN_EFFECTS = new Set(['RECOVER', 'CHANGE_FIELD'])

export interface BeastTemplateProps {
  key: string
  name: string
  description?: string | null
  contract: BeastContract
  grade: BeastGrade
  lineage: BeastLineage
  /** As 2 skills em campo (vazio na Igualdade, que não age). */
  skills: BeastSkill[]
  /** Só no contrato Mestre (9.5): todos cumpridos, senão a build é bloqueada. */
  requirements: GearRequirement[]
  /** Só no contrato Mestre (9.6): títulos que valem 1 requisito, teto de 1. */
  titles: string[]
}

/**
 * Besta do catálogo (admin, D64, D95, D154): o contrato fixo, o grau, a linhagem, as skills em campo e, no Mestre, os
 * requisitos e os títulos. A conta guarda cópias (`Beast`), ligadas a um personagem pelo contrato.
 */
export class BeastTemplate extends Entity<BeastTemplateProps> {
  get key() {
    return this.props.key
  }

  get name() {
    return this.props.name
  }

  get description() {
    return this.props.description ?? null
  }

  get contract() {
    return this.props.contract
  }

  get grade() {
    return this.props.grade
  }

  get lineage() {
    return this.props.lineage
  }

  get skills(): readonly BeastSkill[] {
    return this.props.skills
  }

  get requirements(): readonly GearRequirement[] {
    return this.props.requirements
  }

  get titles(): readonly string[] {
    return this.props.titles
  }

  get isSacred() {
    return this.props.grade === BeastGrade.SACRED
  }

  /** A besta entra na grade (Dominância e Mestre); a Igualdade não ocupa célula. */
  get takesCell() {
    return this.props.contract !== BeastContract.EQUALITY
  }

  static create(
    input: BeastTemplateProps,
    id?: UniqueEntityId
  ): Either<InvalidBeastError, BeastTemplate> {
    const props: BeastTemplateProps = {
      ...input,
      skills: input.skills.map((s) => ({ ...s, effects: [...s.effects] })),
      requirements: input.requirements.map((r) => ({ ...r })),
      titles: [...input.titles],
    }

    const error = validate(props)
    if (error) return left(new InvalidBeastError(error))

    return right(new BeastTemplate(props, id))
  }
}

/** A skill da besta passa pelas mesmas regras da skill do catálogo (alvo, alcance, Poder, efeitos). */
export function beastSkillError(
  beastKey: string,
  skill: BeastSkill,
  index: number
): string | null {
  if (skill.effects.some((e) => FORBIDDEN_EFFECTS.has(e.type))) {
    return `skill ${index + 1}: a besta não usa recuperar nem trocar o campo`
  }

  const created = Skill.create({
    key: `beast:${beastKey}:${index}`,
    name: skill.name,
    description: skill.description ?? null,
    tier: skill.tier,
    target: skill.target,
    range: skill.range ?? null,
    area: skill.area,
    cooldown: skill.cooldown,
    desgastePercent: 0,
    baseHitChance: skill.baseHitChance ?? null,
    minLevel: SKILL_TIER_REFERENCE[skill.tier]?.minLevel ?? 0,
    effects: skill.effects,
    variant: null,
  })

  return created.isLeft()
    ? `skill ${index + 1}: ${created.value.message}`
    : null
}

function validate(props: BeastTemplateProps): string | null {
  const { contract, grade, requirements, titles, skills } = props

  if (!Object.values(BeastContract).includes(contract)) {
    return 'contrato desconhecido'
  }
  if (!BEAST_GRADE_ORDER.includes(grade)) return 'grau desconhecido'
  if (
    (props.lineage as Lineage) === Lineage.NONE ||
    !Object.values(Lineage).includes(props.lineage)
  ) {
    return 'a linhagem é a de uma variante (nunca none)'
  }

  if (contract === BeastContract.EQUALITY) {
    if (skills.length > 0) return 'a besta da Igualdade não age: sem skills'
  } else {
    if (skills.length !== BEAST_SKILL_COUNT) {
      return `a besta em campo tem ${BEAST_SKILL_COUNT} skills`
    }
    for (const [index, skill] of skills.entries()) {
      const error = beastSkillError(props.key, skill, index)
      if (error) return error
    }
  }

  if (contract !== BeastContract.MASTER) {
    if (requirements.length > 0 || titles.length > 0) {
      return 'requisitos e títulos só no contrato Mestre'
    }
    return null
  }

  const count = MASTER_REQUIREMENT_COUNT[grade]
  if (requirements.length !== count) {
    return `o contrato Mestre no grau ${grade} pede ${count} requisitos`
  }
  if (new Set(requirements.map((r) => r.stat)).size !== requirements.length) {
    return 'stat repetido nos requisitos'
  }
  for (const level of Object.values(AwakeningRequirementLevel)) {
    if (requirements.filter((r) => r.level === level).length > 2) {
      return `no máximo 2 requisitos ${level === 'HIGH' ? 'altos' : 'baixos'}`
    }
  }
  const needsLow =
    BEAST_GRADE_ORDER.indexOf(grade) >=
    BEAST_GRADE_ORDER.indexOf(MASTER_LOW_REQUIRED_FROM)
  if (needsLow && !requirements.some((r) => r.level === 'LOW')) {
    return 'do Mestre para cima, pelo menos 1 requisito "baixo"'
  }

  const unknown = titles.filter((t) => !KNOWN_TITLES.includes(t))
  if (unknown.length > 0) {
    return `título desconhecido: ${unknown.join(', ')} (hoje: ${KNOWN_TITLES.join(', ')})`
  }
  if (new Set(titles).size !== titles.length) return 'título repetido'

  return null
}
