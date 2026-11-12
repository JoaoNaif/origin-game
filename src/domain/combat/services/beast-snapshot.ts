import {
  BEAST_SPEED_SHARE,
  BEAST_WILL_SHARE,
  DOMINANCE_WILL_COST,
  EQUALITY_ABSORB_SHARE,
  EQUALITY_BREAK_PERCENT,
  EQUALITY_VALUES,
  beastDuration,
  beastStatPercent,
} from '@/domain/beasts/beast-values'
import {
  BeastSkill,
  BeastTemplate,
} from '@/domain/beasts/entities/beast-template'
import { BeastContract } from '@/domain/beasts/enums/beast-contract'
import { Stat } from '@/domain/characters/enums/stat'
import { Passive } from '@/domain/characters/value-objects/passive'
import { StatBlock } from '@/domain/characters/value-objects/stat-block'
import { EMPTY_FREE_POINTS } from '@/domain/characters/entities/character'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { SnapshotSkill, SnapshotUnit } from '../value-objects/battle-snapshot'

/** A besta não tem passiva (a do modelo é do personagem). */
const NO_PASSIVE: Passive = {
  name: 'Besta',
  description: 'Sem passiva própria.',
  trigger: { type: 'ALWAYS' },
  effects: [],
}

/** Ref da besta: `PLAYER:B0` (a primeira do personagem 0), `PLAYER:B0-2` (a segunda, com Domador). */
export function beastRef(ownerRef: string, order: number): string {
  const [side, index] = ownerRef.split(':')
  return `${side}:B${index}${order > 1 ? `-${order}` : ''}`
}

/**
 * Stats da besta em campo (9.1): % dos stats do dono pelo contrato e pelo grau; Velocidade 90% e Vontade 50% da do
 * dono. Inteiros, mínimo 1.
 */
export function beastStats(
  ownerStats: StatBlock,
  contract: 'DOMINANCE' | 'MASTER',
  grade: BeastTemplate['grade']
): StatBlock {
  const percent = beastStatPercent(contract, grade) / 100

  return Object.fromEntries(
    Object.values(Stat).map((stat) => {
      const share =
        stat === Stat.SPEED
          ? BEAST_SPEED_SHARE
          : stat === Stat.WILL
            ? BEAST_WILL_SHARE
            : percent
      return [stat, Math.max(1, Math.round(ownerStats[stat] * share))]
    })
  ) as StatBlock
}

/** Skill da besta como valor (sem Desgaste: a besta não paga, D154). */
function toBeastSkill(
  template: BeastTemplate,
  skill: BeastSkill,
  ref: string,
  index: number
): SnapshotSkill {
  return {
    key: `${ref}:${index}`,
    name: skill.name,
    lineage: template.lineage,
    isAwakened: false,
    isEnhanced: false,
    tier: skill.tier,
    target: skill.target,
    range: skill.range ?? null,
    area: skill.area,
    cooldown: skill.cooldown,
    desgastePercent: 0,
    baseHitChance: skill.baseHitChance ?? null,
    effects: [...skill.effects],
  }
}

/**
 * A skill de invocação no slot da build (D43, D154): ação inteira, sem Desgaste, uso único. Dominância e Mestre põem a
 * besta numa célula livre do próprio lado; a Igualdade é em si mesmo (não ocupa célula).
 */
export function summonSkill(
  template: BeastTemplate,
  ownerRef: string,
  ref: string | null
): SnapshotSkill {
  const equality = template.contract === BeastContract.EQUALITY
  const values = EQUALITY_VALUES[template.grade]

  return {
    key: `summon:${ref ?? `${ownerRef}:${template.key}`}`,
    name: `Invocar ${template.name}`,
    lineage: template.lineage,
    isAwakened: false,
    isEnhanced: false,
    tier: SkillTier.STRONG,
    target: equality ? SkillTarget.SELF : SkillTarget.ALLY,
    range: null,
    area: SkillArea.SINGLE,
    cooldown: 0,
    desgastePercent: 0,
    baseHitChance: null,
    singleUse: true,
    beastKey: template.key,
    effects: equality
      ? [
          {
            type: 'EQUALITY',
            bufferPercent: values.bufferPercent,
            bonusPercent: values.bonusPercent,
            duration: beastDuration(template.grade),
            absorbShare: EQUALITY_ABSORB_SHARE,
            breakPercent: EQUALITY_BREAK_PERCENT,
          },
        ]
      : [{ type: 'SUMMON', beastRef: ref! }],
  }
}

/** A besta como unidade fora de campo (Dominância e Mestre), com os stats já tirados do dono. */
export function beastUnit(
  template: BeastTemplate,
  ref: string,
  owner: SnapshotUnit,
  ownerStats: StatBlock
): SnapshotUnit {
  const contract = template.contract as 'DOMINANCE' | 'MASTER'
  const stats = beastStats(ownerStats, contract, template.grade)

  return {
    ref,
    name: template.name,
    templateKey: template.key,
    characterClass: owner.characterClass,
    lineages: [],
    level: owner.level,
    profile: stats,
    freePoints: { ...EMPTY_FREE_POINTS },
    traitEffects: [],
    traitKeys: [],
    lineageCostPercent: {},
    passive: NO_PASSIVE,
    skills: template.skills.map((s, i) => toBeastSkill(template, s, ref, i)),
    stats,
    beast: {
      key: template.key,
      name: template.name,
      contract,
      grade: template.grade,
      ownerRef: owner.ref,
      duration: beastDuration(template.grade),
      ownerWillCost:
        contract === BeastContract.DOMINANCE
          ? DOMINANCE_WILL_COST[template.grade]
          : 0,
      auto: contract === BeastContract.DOMINANCE,
    },
    // fora de campo: a posição só vale depois da invocação
    row: 0,
    column: 0,
  }
}
