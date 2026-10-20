import { BattleSide } from '@/domain/combat/enums/battle-enums'
import {
  BattleSnapshot,
  SnapshotSkill,
  SnapshotUnit,
} from '@/domain/combat/value-objects/battle-snapshot'
import { CharacterClass } from '@/domain/characters/enums/character-class'
import { Lineage } from '@/domain/characters/enums/lineage'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { EMPTY_FREE_POINTS } from '@/domain/characters/entities/character'
import { VANGUARD_STATS } from './make-character-template'

export function makeSnapshotSkill(key: string): SnapshotSkill {
  return {
    key,
    name: key,
    lineage: Lineage.NONE,
    isAwakened: false,
    isEnhanced: false,
    tier: SkillTier.BASIC,
    target: SkillTarget.ENEMY,
    range: SkillRange.MELEE,
    area: SkillArea.SINGLE,
    cooldown: 0,
    desgastePercent: 1,
    baseHitChance: 0.8,
    effects: [{ type: 'DAMAGE', power: 0.8 }],
  }
}

const CELLS = [
  { row: 0, column: 0 },
  { row: 2, column: 0 },
  { row: 1, column: 1 },
  { row: 1, column: 2 },
]

export function makeSnapshotUnit(
  ref: string,
  index: number,
  override: Partial<SnapshotUnit> = {}
): SnapshotUnit {
  return {
    ref,
    name: `Unidade ${ref}`,
    templateKey: `recruit-${index}`,
    characterClass: CharacterClass.VANGUARD,
    lineages: [],
    level: 15,
    profile: VANGUARD_STATS,
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
    skills: [0, 1, 2, 3].map((i) => makeSnapshotSkill(`${ref}-skill-${i}`)),
    ...CELLS[index],
    ...override,
  }
}

/** Foto válida: 4 unidades de cada lado (`PLAYER:0..3` e `OPPONENT:0..3`). */
export function makeBattleSnapshot(): BattleSnapshot {
  return {
    player: {
      side: BattleSide.PLAYER,
      name: 'Tester',
      units: [0, 1, 2, 3].map((i) => makeSnapshotUnit(`PLAYER:${i}`, i)),
    },
    opponent: {
      side: BattleSide.OPPONENT,
      name: 'Muralha de recrutas',
      units: [0, 1, 2, 3].map((i) => makeSnapshotUnit(`OPPONENT:${i}`, i)),
    },
    field: { initial: null, catalog: [] },
  }
}
