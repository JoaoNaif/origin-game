import { CharacterClass } from '@/domain/characters/enums/character-class'
import { Lineage } from '@/domain/characters/enums/lineage'
import { Passive } from '@/domain/characters/value-objects/passive'
import { StatBlock } from '@/domain/characters/value-objects/stat-block'
import { TraitEffect } from '@/domain/characters/value-objects/trait-effect'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { SkillEffect } from '@/domain/skills/value-objects/skill-effect'
import { GridPosition } from '@/domain/squads/value-objects/grid-position'
import { BattleSide } from '../enums/battle-enums'

/** Skill como estava no início da batalha (valores, não referência: o catálogo pode mudar depois). */
export interface SnapshotSkill {
  key: string
  name: string
  lineage: Lineage
  isAwakened: boolean
  isEnhanced: boolean
  tier: SkillTier
  target: SkillTarget
  range: SkillRange | null
  area: SkillArea
  cooldown: number
  desgastePercent: number
  baseHitChance: number | null
  effects: SkillEffect[]
}

/** Personagem como estava no início: tudo que o motor precisa para calcular stats e jogar. */
export interface SnapshotUnit extends GridPosition {
  /** Identificador da unidade na batalha (ex.: `PLAYER:0`), usado pelas ações. */
  ref: string
  name: string
  templateKey: string
  characterClass: CharacterClass
  /** Linhagens das variantes (principal primeiro); vazio = sem variante. */
  lineages: Lineage[]
  level: number
  /** Perfil do modelo no nível 100 (o motor deriva os stats do nível). */
  profile: StatBlock
  /** Pontos livres (HP em pontos); NPC usa a distribuição padrão. */
  freePoints: StatBlock
  traitEffects: TraitEffect[]
  passive: Passive
  /** As 4 skills da build, na ordem dos slots. */
  skills: SnapshotSkill[]
}

export interface SnapshotSide {
  side: BattleSide
  /** Nome exibido (conta ou squad da máquina). */
  name: string
  units: SnapshotUnit[]
}

/**
 * Foto dos dois lados no início da batalha (D8, `data_model.md` 3.10). Com a seed e o log de ações, reproduz a
 * batalha inteira (replay), mesmo que o personagem ou o catálogo mudem depois.
 */
export interface BattleSnapshot {
  player: SnapshotSide
  opponent: SnapshotSide
}
