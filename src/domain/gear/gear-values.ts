import { Lineage } from '@/domain/characters/enums/lineage'
import { Rarity } from '@/domain/characters/enums/rarity'
import { Stat } from '@/domain/characters/enums/stat'
import { RARITY_SALE_VALUE } from '@/domain/economy/economy-values'
import { GearBond } from './enums/gear-bond'
import { GearGrade } from './enums/gear-grade'
import { GearPassive } from './value-objects/gear-passive'

/**
 * Valores do equipamento vivo (D94, `living_gear_brief.md` 9). Placeholders aprovados, a ajustar com simulação.
 */

export const GEAR_GRADE_ORDER: readonly GearGrade[] = [
  GearGrade.SQUIRE,
  GearGrade.KNIGHT,
  GearGrade.MASTER,
  GearGrade.KING,
  GearGrade.DIVINE,
]

/** Bônus de stats no elo pleno (9.2): stat principal e secundário, escolhidos pelo admin. */
export const GEAR_STAT_PERCENTS: Record<
  GearGrade,
  { primary: number; secondary: number }
> = {
  SQUIRE: { primary: 3, secondary: 2 },
  KNIGHT: { primary: 5, secondary: 3 },
  MASTER: { primary: 8, secondary: 5 },
  KING: { primary: 12, secondary: 8 },
  DIVINE: { primary: 16, secondary: 11 },
}

/** O admin ajusta o bônus em até ±15% dentro do grau (9.2). */
export const GEAR_ADMIN_TUNING = 0.15

/** Custo do elo pleno (9.2): Desgaste já no início da batalha, em % do stat da linhagem do equipamento. */
export const GEAR_FULL_BOND_COST: Record<GearGrade, number> = {
  SQUIRE: 1.5,
  KNIGHT: 2.5,
  MASTER: 3.5,
  KING: 5,
  DIVINE: 7,
}

/** Quanto do efeito (bônus e passiva) vale em cada elo (9.3). */
export const GEAR_BOND_FACTOR: Record<GearBond, number> = {
  FULL: 1,
  PARTIAL: 0.6,
  NONE: 0.3,
}

/** Chance de perder a ação (9.3), em %: começa em `start`, sobe `step` a cada turno, para em `max`. */
export interface GearLoseAction {
  start: number
  step: number
  max: number
}

/** Penalidades do elo parcial e do sem elo (9.3), só dentro da batalha. */
export interface GearPenalty {
  /** Queda de stats, em % (negativo). */
  statPercents: Partial<Record<Stat, number>>
  loseAction: GearLoseAction | null
}

const ALL_STATS = Object.values(Stat)

function allStats(percent: number): Partial<Record<Stat, number>> {
  return Object.fromEntries(ALL_STATS.map((s) => [s, percent]))
}

export const GEAR_PENALTIES: Record<
  Exclude<GearBond, 'FULL'>,
  Record<GearGrade, GearPenalty>
> = {
  PARTIAL: {
    SQUIRE: {
      statPercents: { SPEED: -0.75, EVASION: -0.75 },
      loseAction: null,
    },
    KNIGHT: {
      statPercents: { PRECISION: -2, EVASION: -2 },
      loseAction: null,
    },
    MASTER: {
      statPercents: allStats(-1),
      loseAction: { start: 1, step: 1, max: 8 },
    },
    KING: {
      statPercents: allStats(-1.5),
      loseAction: { start: 2, step: 2, max: 15 },
    },
    DIVINE: {
      statPercents: allStats(-2),
      loseAction: { start: 3, step: 3, max: 20 },
    },
  },
  NONE: {
    SQUIRE: { statPercents: { SPEED: -3, EVASION: -3 }, loseAction: null },
    KNIGHT: {
      statPercents: { PRECISION: -8, EVASION: -8 },
      loseAction: null,
    },
    MASTER: {
      statPercents: allStats(-6),
      loseAction: { start: 3, step: 3, max: 25 },
    },
    KING: {
      statPercents: allStats(-9),
      loseAction: { start: 6, step: 5, max: 45 },
    },
    DIVINE: {
      statPercents: allStats(-12),
      loseAction: { start: 10, step: 8, max: 60 },
    },
  },
}

/** Quantos requisitos cada grau pede (9.4). */
export const GEAR_REQUIREMENT_COUNT: Record<GearGrade, number> = {
  SQUIRE: 2,
  KNIGHT: 2,
  MASTER: 3,
  KING: 4,
  DIVINE: 4,
}

/** Do Mestre para cima, pelo menos 1 requisito "baixo" (9.4). */
export const GEAR_LOW_REQUIRED_FROM: GearGrade = GearGrade.MASTER

/** Cada equipamento tem uma lista de 2 a 5 títulos que ajudam no elo (9.1). */
export const GEAR_TITLES = { min: 2, max: 5 } as const

/**
 * Requisitos que um título da lista ou o traço Prodígio podem substituir, juntos (D81, D88): no máximo 1. O Prodígio
 * vale "como um título", então divide o mesmo teto.
 */
export const GEAR_MAX_WAIVERS = 1

/** Multiplicador da passiva pelo grau (9.5); a tabela da linhagem vale no Rei. */
export const GEAR_PASSIVE_GRADE_FACTOR: Record<GearGrade, number> = {
  SQUIRE: 0.4,
  KNIGHT: 0.6,
  MASTER: 0.8,
  KING: 1,
  DIVINE: 1.25,
}

/** Efeito leve de cada linhagem no grau Rei, elo pleno (9.5). */
export const GEAR_LINEAGE_PASSIVE: Record<
  Exclude<Lineage, 'NONE'>,
  GearPassive
> = {
  ELEMENTAL: { type: 'DOT_ON_HIT', chance: 0.15 },
  MATERIAL: { type: 'SINGLE_TARGET_REDUCTION', percent: 10 },
  VECTORIAL: { type: 'IGNORE_DEFENSE', percent: 10 },
  PSYCHIC: { type: 'STATUS_WILL', percent: 15 },
  BIOLOGICAL: { type: 'REGEN', percentOfMaxHp: 2 },
  FUNDAMENTAL: { type: 'INITIAL_SHIELD', percentOfMaxHp: 5 },
}

/** Sem variante, o bônus de stats do equipamento vale ×1,25 (9.7). */
export const GEAR_NO_VARIANT_BONUS = 1.25

/**
 * Raridade equivalente do grau (3.3 da progressão): no baú e na venda ao sistema. Divino fica fora dos baús e não se
 * vende (9.6).
 */
export const GEAR_GRADE_RARITY: Record<GearGrade, Rarity | null> = {
  SQUIRE: Rarity.E,
  KNIGHT: Rarity.C,
  MASTER: Rarity.A,
  KING: Rarity.SS,
  DIVINE: null,
}

/** Valor de venda ao sistema (3.3 da progressão), pela raridade equivalente; nulo = não se vende (Divino, 9.6). */
export function gearSaleValue(grade: GearGrade): number | null {
  const rarity = GEAR_GRADE_RARITY[grade]
  return rarity ? RARITY_SALE_VALUE[rarity] : null
}
