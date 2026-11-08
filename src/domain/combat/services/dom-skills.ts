import { DomPillar } from '@/domain/characters/enums/dom-pillar'
import { Lineage } from '@/domain/characters/enums/lineage'
import {
  advancedDomPillars,
  DOM_TITLES,
  domStatPercents,
} from '@/domain/characters/services/dom-rules'
import { DomPillars } from '@/domain/characters/value-objects/dom-state'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import {
  SnapshotDom,
  SnapshotEffect,
  SnapshotSkill,
} from '../value-objects/battle-snapshot'

/** Valores das skills únicas do avançado (D93, `dom_brief.md` 8.4). */
export const DOM_SKILL_RULES = {
  /** Rei: −15% em todos os stats por 3 turnos do afetado, chance pela fórmula de status com base 80%. */
  kingPercent: -15,
  kingDuration: 3,
  kingBaseChance: 0.8,
  /** Vidente: perde 2 turnos; chance pelo DOM da Mente do alvo. */
  seerDuration: 2,
  seerChanceByMind: { NONE: 1, BASIC: 1, INTERMEDIATE: 0.7, ADVANCED: 0.3 },
  /** Resiliente: cura 50% do HP máximo (Poder 1,0 = 10%, D92), como qualquer cura. */
  resilientHealPower: 5,
} as const

const SHAPES: Record<
  DomPillar,
  Pick<SnapshotSkill, 'target' | 'range' | 'area'> & {
    effects: SnapshotEffect[]
  }
> = {
  MIND: {
    target: SkillTarget.ENEMY,
    range: SkillRange.RANGED,
    area: SkillArea.SINGLE,
    effects: [
      {
        type: 'FORESIGHT',
        duration: DOM_SKILL_RULES.seerDuration,
        chanceByMind: { ...DOM_SKILL_RULES.seerChanceByMind },
      },
    ],
  },
  HEART: {
    target: SkillTarget.SELF,
    range: null,
    area: SkillArea.SINGLE,
    effects: [{ type: 'HEAL', power: DOM_SKILL_RULES.resilientHealPower }],
  },
  BODY: {
    target: SkillTarget.SELF,
    range: null,
    area: SkillArea.SINGLE,
    effects: [{ type: 'INVULNERABLE' }],
  },
  AURA: {
    target: SkillTarget.ENEMY,
    range: SkillRange.RANGED,
    area: SkillArea.GRID,
    effects: [
      {
        type: 'WEAKEN',
        percent: DOM_SKILL_RULES.kingPercent,
        duration: DOM_SKILL_RULES.kingDuration,
        baseChance: DOM_SKILL_RULES.kingBaseChance,
      },
    ],
  },
}

/**
 * Skill única do pilar avançado (D60, D93) como valor da batalha: fora das 4 da build, uso único, sem custo, sem
 * Desgaste e sem teste de acerto. Tipo Final: o Silenciado a bloqueia e o Travado a prefere, como qualquer skill (D152).
 */
export function domSkill(pillar: DomPillar): SnapshotSkill {
  const shape = SHAPES[pillar]

  return {
    key: `dom:${pillar.toLowerCase()}`,
    name: DOM_TITLES[pillar],
    lineage: Lineage.NONE,
    isAwakened: false,
    isEnhanced: false,
    tier: SkillTier.FINAL,
    target: shape.target,
    range: shape.range,
    area: shape.area,
    cooldown: 0,
    desgastePercent: 0,
    baseHitChance: null,
    effects: shape.effects.map((e) => ({ ...e })),
    singleUse: true,
    domPillar: pillar,
  }
}

/** As skills únicas dos pilares avançados, na ordem dos pilares (sem teto, D93 8.5). */
export function domSkills(pillars: DomPillars): SnapshotSkill[] {
  return advancedDomPillars(pillars).map(domSkill)
}

/** DOM da unidade para o snapshot; nulo sem nenhum pilar. */
export function snapshotDom(pillars: DomPillars): SnapshotDom | null {
  if (Object.keys(pillars).length === 0) return null

  return { pillars: { ...pillars }, statPercents: domStatPercents(pillars) }
}
