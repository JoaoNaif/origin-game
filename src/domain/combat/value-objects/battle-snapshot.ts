import { CharacterClass } from '@/domain/characters/enums/character-class'
import { DomLevel } from '@/domain/characters/enums/dom-level'
import { DomPillar } from '@/domain/characters/enums/dom-pillar'
import { DomPillars } from '@/domain/characters/value-objects/dom-state'
import { Lineage } from '@/domain/characters/enums/lineage'
import { Passive } from '@/domain/characters/value-objects/passive'
import { Stat } from '@/domain/characters/enums/stat'
import { StatBlock } from '@/domain/characters/value-objects/stat-block'
import { TraitEffect } from '@/domain/characters/value-objects/trait-effect'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import {
  EffectRecipient,
  SkillEffect,
} from '@/domain/skills/value-objects/skill-effect'
import { GridPosition } from '@/domain/squads/value-objects/grid-position'
import { BattleSide } from '../enums/battle-enums'

/**
 * Efeitos que só as skills únicas do DOM têm (D93, D152): ficam fora do catálogo (o admin não monta skill com eles).
 */
export type DomSkillEffect = { appliesTo?: EffectRecipient } &
  /** Rei: −% em todos os stats por N turnos do afetado; chance pela fórmula de status (uma por alvo). */
  (
    | { type: 'WEAKEN'; percent: number; duration: number; baseChance: number }
    /** Vidente: Atordoado por N turnos; a chance vem do DOM da Mente do alvo, não da fórmula de status. */
    | {
        type: 'FORESIGHT'
        duration: number
        chanceByMind: Record<DomLevel | 'NONE', number>
      }
    /** Indestrutível: anula todo dano recebido até o próximo turno de quem usou, inclusive o dano contínuo dele. */
    | { type: 'INVULNERABLE' }
  )

/** Efeito de uma skill na batalha: os do catálogo e os das skills únicas do DOM. */
export type SnapshotEffect = SkillEffect | DomSkillEffect

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
  effects: SnapshotEffect[]
  /** Uso único por batalha (skill única do DOM, D60). */
  singleUse?: boolean
  /** Pilar da skill única do DOM (D93). */
  domPillar?: DomPillar
}

/** DOM da unidade no início (D93): os níveis (a Vidente lê a Mente do alvo) e os % de stat que eles dão. */
export interface SnapshotDom {
  pillars: DomPillars
  statPercents: Partial<Record<Stat, number>>
}

/** Personagem como estava no início: tudo que o motor precisa para calcular stats e jogar. */
export interface SnapshotUnit extends GridPosition {
  /** Identificador da unidade na batalha (ex.: `PLAYER:0`), usado pelas ações. */
  ref: string
  /** Personagem da conta (lado do jogador; o NPC não tem): quem recebe o XP no fim. */
  characterId?: string
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
  /** `key` dos traços (o campo de batalha pede traços pelo nome, D98). */
  traitKeys: string[]
  /**
   * Modificador de custo do Desgaste por linhagem, em % (ex.: sangue puro −10% na linhagem da família, D88). Já
   * resolvido pela variante do traço, porque `traitEffects` não guarda de qual variante o efeito é.
   */
  lineageCostPercent: Partial<Record<Lineage, number>>
  passive: Passive
  /** As 4 skills da build, na ordem dos slots, e depois as skills únicas do DOM (uma por pilar avançado). */
  skills: SnapshotSkill[]
  /** DOM no início; ausente = sem DOM (NPC, ou batalha de antes do DOM). */
  dom?: SnapshotDom
}

export interface SnapshotSide {
  side: BattleSide
  /** Nome exibido (conta ou squad da máquina). */
  name: string
  units: SnapshotUnit[]
}

/** Campo de batalha como valor (D98). */
export interface SnapshotField {
  key: string
  name: string
  /** Quem tem qualquer um destes traços recebe o bônus. */
  requiredTraitKeys: string[]
  primaryStat: Stat
  secondaryStat: Stat
  primaryPercent: number
  secondaryPercent: number
}

export interface SnapshotFieldSetup {
  /** O campo sorteado no início (D28); nulo = sem campo (nenhum passou no sorteio justo, D98). */
  initial: SnapshotField | null
  /** Campos para onde uma skill pode trocar (o catálogo da batalha). */
  catalog: SnapshotField[]
}

/**
 * Foto dos dois lados no início da batalha (D8, `data_model.md` 3.10). Com a seed e o log de ações, reproduz a
 * batalha inteira (replay), mesmo que o personagem ou o catálogo mudem depois.
 */
export interface BattleSnapshot {
  player: SnapshotSide
  opponent: SnapshotSide
  field: SnapshotFieldSetup
}
