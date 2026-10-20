import { EMPTY_FREE_POINTS } from '@/domain/characters/entities/character'
import { CharacterClass } from '@/domain/characters/enums/character-class'
import { Lineage } from '@/domain/characters/enums/lineage'
import { Stat } from '@/domain/characters/enums/stat'
import { StatBlock } from '@/domain/characters/value-objects/stat-block'
import { BattleSide } from '@/domain/combat/enums/battle-enums'
import {
  BattleSnapshot,
  SnapshotSkill,
  SnapshotUnit,
} from '@/domain/combat/value-objects/battle-snapshot'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { StatusType } from '@/domain/skills/enums/status-type'
import { SkillEffect } from '@/domain/skills/value-objects/skill-effect'

/** Perfis do nível 100 (`classes_brief.md` 2). */
const PROFILES: Partial<Record<CharacterClass, StatBlock>> = {
  VANGUARD: {
    HP: 700,
    ATTACK: 100,
    DEFENSE: 120,
    SPEED: 75,
    PRECISION: 85,
    EVASION: 55,
    WILL: 95,
  },
  GUARDIAN: {
    HP: 780,
    ATTACK: 60,
    DEFENSE: 140,
    SPEED: 70,
    PRECISION: 70,
    EVASION: 50,
    WILL: 115,
  },
  MARKSMAN: {
    HP: 420,
    ATTACK: 125,
    DEFENSE: 60,
    SPEED: 95,
    PRECISION: 125,
    EVASION: 90,
    WILL: 85,
  },
  SUPPORT: {
    HP: 500,
    ATTACK: 70,
    DEFENSE: 80,
    SPEED: 105,
    PRECISION: 85,
    EVASION: 100,
    WILL: 130,
  },
}

interface SkillSpec {
  key: string
  tier: SkillTier
  lineage: Lineage
  target?: SkillTarget
  range?: SkillRange | null
  area?: SkillArea
  cooldown: number
  desgastePercent: number
  baseHitChance?: number | null
  effects: SkillEffect[]
}

function skill(spec: SkillSpec): SnapshotSkill {
  return {
    name: spec.key,
    isAwakened: false,
    isEnhanced: false,
    target: SkillTarget.ENEMY,
    range: SkillRange.MELEE,
    area: SkillArea.SINGLE,
    baseHitChance: 0.9,
    ...spec,
  }
}

/** Kits com os valores do `skills_brief.md` 12.1 a 12.4 (alcance à distância ×0,9 Poder e ×1,25 custo). */
function kit(characterClass: CharacterClass, ref: string): SnapshotSkill[] {
  const k = (name: string) => `${ref}:${name}`

  switch (characterClass) {
    case CharacterClass.VANGUARD:
      return [
        skill({
          key: k('golpe'),
          tier: SkillTier.BASIC,
          lineage: Lineage.MATERIAL,
          cooldown: 0,
          desgastePercent: 1,
          effects: [{ type: 'DAMAGE', power: 0.8 }],
        }),
        skill({
          key: k('investida'),
          tier: SkillTier.STANDARD,
          lineage: Lineage.MATERIAL,
          cooldown: 1,
          desgastePercent: 1.5,
          effects: [{ type: 'DAMAGE', power: 1.0 }],
        }),
        skill({
          key: k('varredura'),
          tier: SkillTier.REINFORCED,
          lineage: Lineage.MATERIAL,
          area: SkillArea.LINE,
          cooldown: 2,
          desgastePercent: 3.9,
          effects: [{ type: 'DAMAGE', power: 1.1 }],
        }),
        skill({
          key: k('esmagar'),
          tier: SkillTier.STRONG,
          lineage: Lineage.MATERIAL,
          cooldown: 3,
          desgastePercent: 5,
          effects: [{ type: 'DAMAGE', power: 1.6 }],
        }),
      ]
    case CharacterClass.GUARDIAN:
      return [
        skill({
          key: k('escudada'),
          tier: SkillTier.BASIC,
          lineage: Lineage.MATERIAL,
          cooldown: 0,
          desgastePercent: 1,
          effects: [{ type: 'DAMAGE', power: 0.8 }],
        }),
        skill({
          key: k('atordoar'),
          tier: SkillTier.STANDARD,
          lineage: Lineage.MATERIAL,
          cooldown: 2,
          desgastePercent: 1.5,
          effects: [
            { type: 'DAMAGE', power: 0.6 },
            {
              type: 'APPLY_STATUS',
              status: StatusType.STUN,
              duration: 1,
              baseChance: 0.7,
            },
          ],
        }),
        skill({
          key: k('muralha'),
          tier: SkillTier.REINFORCED,
          lineage: Lineage.MATERIAL,
          target: SkillTarget.ALLY,
          range: null,
          baseHitChance: null,
          cooldown: 2,
          desgastePercent: 3,
          effects: [{ type: 'SHIELD', power: 1.5 }],
        }),
        skill({
          key: k('firmeza'),
          tier: SkillTier.STANDARD,
          lineage: Lineage.MATERIAL,
          target: SkillTarget.SELF,
          range: null,
          baseHitChance: null,
          cooldown: 2,
          desgastePercent: 1.5,
          effects: [
            {
              type: 'STAT_MODIFIER',
              stat: Stat.DEFENSE,
              percent: 15,
              duration: 2,
            },
          ],
        }),
      ]
    case CharacterClass.MARKSMAN:
      return [
        skill({
          key: k('disparo'),
          tier: SkillTier.BASIC,
          lineage: Lineage.VECTORIAL,
          range: SkillRange.RANGED,
          cooldown: 0,
          desgastePercent: 1.25,
          effects: [{ type: 'DAMAGE', power: 0.72 }],
        }),
        skill({
          key: k('mira'),
          tier: SkillTier.STANDARD,
          lineage: Lineage.VECTORIAL,
          range: SkillRange.RANGED,
          cooldown: 1,
          desgastePercent: 1.9,
          effects: [{ type: 'DAMAGE', power: 0.9 }],
        }),
        skill({
          key: k('marcar'),
          tier: SkillTier.STANDARD,
          lineage: Lineage.VECTORIAL,
          range: SkillRange.RANGED,
          cooldown: 2,
          desgastePercent: 1.9,
          effects: [
            { type: 'DAMAGE', power: 0.5 },
            {
              type: 'APPLY_STATUS',
              status: StatusType.MARK,
              duration: 3,
              baseChance: 0.8,
            },
          ],
        }),
        skill({
          key: k('tiro-certeiro'),
          tier: SkillTier.STRONG,
          lineage: Lineage.VECTORIAL,
          range: SkillRange.RANGED,
          cooldown: 3,
          desgastePercent: 6.25,
          effects: [{ type: 'DAMAGE', power: 1.44 }],
        }),
      ]
    default:
      return [
        skill({
          key: k('toque'),
          tier: SkillTier.BASIC,
          lineage: Lineage.BIOLOGICAL,
          range: SkillRange.RANGED,
          cooldown: 0,
          desgastePercent: 1.25,
          effects: [{ type: 'DAMAGE', power: 0.72 }],
        }),
        skill({
          key: k('curar'),
          tier: SkillTier.STANDARD,
          lineage: Lineage.BIOLOGICAL,
          target: SkillTarget.ALLY,
          range: null,
          baseHitChance: null,
          cooldown: 1,
          desgastePercent: 1.5,
          effects: [{ type: 'HEAL', power: 1.5 }],
        }),
        skill({
          key: k('inspirar'),
          tier: SkillTier.STANDARD,
          lineage: Lineage.BIOLOGICAL,
          target: SkillTarget.ALLY,
          range: null,
          baseHitChance: null,
          cooldown: 2,
          desgastePercent: 1.5,
          effects: [
            {
              type: 'STAT_MODIFIER',
              stat: Stat.ATTACK,
              percent: 15,
              duration: 2,
            },
          ],
        }),
        skill({
          key: k('veneno'),
          tier: SkillTier.STANDARD,
          lineage: Lineage.BIOLOGICAL,
          range: SkillRange.RANGED,
          cooldown: 2,
          desgastePercent: 1.9,
          effects: [
            {
              type: 'APPLY_STATUS',
              status: StatusType.DOT,
              duration: 3,
              baseChance: 0.8,
            },
          ],
        }),
      ]
  }
}

const LINEAGE: Partial<Record<CharacterClass, Lineage>> = {
  VANGUARD: Lineage.MATERIAL,
  GUARDIAN: Lineage.MATERIAL,
  MARKSMAN: Lineage.VECTORIAL,
  SUPPORT: Lineage.BIOLOGICAL,
}

/** Formação: Guardião e Vanguarda na frente, Atirador e Suporte atrás deles. */
const FORMATION: {
  characterClass: CharacterClass
  row: number
  column: number
}[] = [
  { characterClass: CharacterClass.GUARDIAN, row: 0, column: 0 },
  { characterClass: CharacterClass.VANGUARD, row: 1, column: 0 },
  { characterClass: CharacterClass.MARKSMAN, row: 0, column: 1 },
  { characterClass: CharacterClass.SUPPORT, row: 1, column: 1 },
]

function unit(side: BattleSide, index: number, level: number): SnapshotUnit {
  const { characterClass, row, column } = FORMATION[index]
  const ref = `${side}:${index}`

  return {
    ref,
    name: `${characterClass} ${index}`,
    templateKey: `calibration-${characterClass.toLowerCase()}`,
    characterClass,
    lineages: [LINEAGE[characterClass]!],
    level,
    profile: PROFILES[characterClass]!,
    freePoints: { ...EMPTY_FREE_POINTS },
    traitEffects: [],
    traitKeys: [],
    lineageCostPercent: {},
    passive: {
      name: 'Firmeza',
      description: 'Com HP abaixo de 30%, recebe 10% menos dano.',
      trigger: { type: 'HP_BELOW', percent: 30 },
      effects: [{ type: 'REDUCE_DAMAGE', percent: 10 }],
    },
    skills: kit(characterClass, ref),
    row,
    column,
  }
}

/**
 * Squad espelhada para a calibração (`pvp_brief.md` 10.4, "IA contra IA, mesmo squad"): Guardião, Vanguarda, Atirador e
 * Suporte, com dano, área, atordoar, marcar, veneno, cura, escudo e buffs. Os dois lados são iguais.
 */
export function makeCalibrationSnapshot(level = 50): BattleSnapshot {
  const side = (s: BattleSide, name: string) => ({
    side: s,
    name,
    units: [0, 1, 2, 3].map((i) => unit(s, i, level)),
  })

  return {
    player: side(BattleSide.PLAYER, 'Espelho A'),
    opponent: side(BattleSide.OPPONENT, 'Espelho B'),
    field: { initial: null, catalog: [] },
  }
}
