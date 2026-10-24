import { SkillArea } from '../enums/skill-area'
import { SkillRange } from '../enums/skill-range'
import { SkillTarget } from '../enums/skill-target'
import {
  SKILL_TIER_REFERENCE,
  SkillTier,
  SkillTierReference,
} from '../enums/skill-tier'

interface Modifier {
  power: number
  cost: number
}

const NEUTRAL: Modifier = { power: 1, cost: 1 }

/** Modificadores por alcance (D92, `skills_brief.md` 12.2). Corpo a corpo é a referência. */
const RANGE_MODIFIER: Record<SkillRange, Modifier> = {
  MELEE: NEUTRAL,
  RANGED: { power: 0.9, cost: 1.25 },
  // ×0,85 desde o D122: acerta o fundo da linha e não é interceptado
  FLANK: { power: 0.85, cost: 1.4 },
  PIERCING: { power: 0.65, cost: 1.5 },
}

/** Modificadores por área contra inimigos (D92). */
const ENEMY_AREA_MODIFIER: Record<SkillArea, Modifier> = {
  SINGLE: NEUTRAL,
  LINE: { power: 0.85, cost: 1.3 },
  // coluna sem queda (D108): mesmo formato do perfurante, mesmo modificador (D109)
  COLUMN: { power: 0.65, cost: 1.5 },
  GRID: { power: 0.5, cost: 1.5 },
}

/** Skill em vários aliados (buff de squad, D102): magnitude ×0,7 e custo ×1,3. */
const ALLY_AREA_MODIFIER: Modifier = { power: 0.7, cost: 1.3 }

/** Skill none (sem variante, D92): Poder ×0,85, custo ×0,5, cooldown −1 (mín. 0). */
const NONE_MODIFIER = { power: 0.85, cost: 0.5, cooldown: -1 }

export interface SkillReferenceInput {
  tier: SkillTier
  target: SkillTarget
  range?: SkillRange | null
  area: SkillArea
  /** Skill de quem não tem variante. */
  isNone?: boolean
}

const round2 = (value: number) => Math.round(value * 100) / 100

/**
 * Valores de referência de uma skill (tipo + forma). O banco guarda os valores finais, porque o admin
 * pode fugir da tabela (D16); esta função dá o padrão para o seed e para comparar.
 */
export function skillReference(input: SkillReferenceInput): SkillTierReference {
  const base = SKILL_TIER_REFERENCE[input.tier]

  const range =
    input.target === SkillTarget.ENEMY && input.range
      ? RANGE_MODIFIER[input.range]
      : NEUTRAL

  const area =
    input.target === SkillTarget.ENEMY
      ? ENEMY_AREA_MODIFIER[input.area]
      : input.area === SkillArea.SINGLE
        ? NEUTRAL
        : ALLY_AREA_MODIFIER

  const none = input.isNone ? NONE_MODIFIER : { power: 1, cost: 1, cooldown: 0 }

  return {
    power: round2(base.power * range.power * area.power * none.power),
    desgastePercent: round2(
      base.desgastePercent * range.cost * area.cost * none.cost
    ),
    cooldown: Math.max(0, base.cooldown + none.cooldown),
    minLevel: base.minLevel,
  }
}
