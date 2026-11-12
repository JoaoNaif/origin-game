import { Rarity } from '@/domain/characters/enums/rarity'
import { RARITY_SALE_VALUE } from '@/domain/economy/economy-values'
import { BeastGrade } from './enums/beast-grade'

/**
 * Valores dos contratos com bestas (D95, D154, `beast_contracts_brief.md` 9). Placeholders aprovados, a ajustar com
 * simulação.
 */

export const BEAST_GRADE_ORDER: readonly BeastGrade[] = [
  BeastGrade.SQUIRE,
  BeastGrade.KNIGHT,
  BeastGrade.MASTER,
  BeastGrade.KING,
  BeastGrade.SACRED,
]

/** A sagrada vale ×1,25 do Rei (9.1, 9.2). */
export const SACRED_FACTOR = 1.25

/** Stats da besta em % dos stats do dono (9.1), nos graus comuns; a sagrada = Rei × 1,25. */
export const BEAST_STAT_PERCENT: Record<
  'DOMINANCE' | 'MASTER',
  Record<Exclude<BeastGrade, 'SACRED'>, number>
> = {
  DOMINANCE: { SQUIRE: 25, KNIGHT: 35, MASTER: 45, KING: 55 },
  MASTER: { SQUIRE: 40, KNIGHT: 50, MASTER: 60, KING: 70 },
}

/** Velocidade da besta = 90% da do dono; Vontade = 50% (9.1). */
export const BEAST_SPEED_SHARE = 0.9
export const BEAST_WILL_SHARE = 0.5

/** Duração em turnos da besta (Igualdade: turnos do dono), 9.2. */
export const BEAST_DURATION = { normal: 4, sacred: 5 } as const

/** Dominância: Vontade que o dono perde enquanto a besta está em campo, dentro do piso de 80% (9.3). */
export const DOMINANCE_WILL_COST: Record<BeastGrade, number> = {
  SQUIRE: 5,
  KNIGHT: 8,
  MASTER: 11,
  KING: 15,
  // a sagrada não tem linha própria na tabela: fica no custo do Rei (D154)
  SACRED: 15,
}

/** Igualdade (9.4): buffer em % do HP máximo do dono e bônus de Precisão e Esquiva. Sagrada = Rei × 1,25. */
export const EQUALITY_VALUES: Record<
  BeastGrade,
  { bufferPercent: number; bonusPercent: number }
> = {
  SQUIRE: { bufferPercent: 12, bonusPercent: 4 },
  KNIGHT: { bufferPercent: 16, bonusPercent: 6 },
  MASTER: { bufferPercent: 20, bonusPercent: 9 },
  KING: { bufferPercent: 25, bonusPercent: 12 },
  SACRED: { bufferPercent: 31.25, bonusPercent: 15 },
}

/** Igualdade: o buffer absorve 50% de cada golpe; esvaziou, o dono perde 10% do HP máximo (ignora Defesa). */
export const EQUALITY_ABSORB_SHARE = 0.5
export const EQUALITY_BREAK_PERCENT = 10

/** Requisitos do contrato Mestre por grau (9.5); ao menos 1 "baixo" do Mestre para cima. Sem parcial. */
export const MASTER_REQUIREMENT_COUNT: Record<BeastGrade, number> = {
  SQUIRE: 2,
  KNIGHT: 2,
  MASTER: 3,
  KING: 4,
  SACRED: 4,
}
export const MASTER_LOW_REQUIRED_FROM: BeastGrade = BeastGrade.MASTER

/** Teto de bestas em campo ao mesmo tempo por squad; a Igualdade não conta (9.6). */
export const BEAST_FIELD_CAP = 2

/** Bestas por personagem: 1, mais as do traço Domador (`EXTRA_BEAST_SLOT`, D64). Sagrada: uma por personagem. */
export const BEASTS_PER_CHARACTER = 1
export const SACRED_PER_CHARACTER = 1

/** Skills da besta em campo (D154): 2 próprias, do catálogo; a da Igualdade não tem (não age). */
export const BEAST_SKILL_COUNT = 2

/** IA que joga a besta da Dominância (D154): obediente, sem estilo próprio. */
export const DOMINANCE_AI = {
  profile: 'BALANCED',
  difficulty: 'ADVANCED',
} as const

/**
 * Raridade equivalente do grau (progressão 3.3: "equipamento e bestas seguem o mesmo valor pelo grau"), para a venda ao
 * sistema. A sagrada não se vende (só por evento único, como o Divino).
 */
export const BEAST_GRADE_RARITY: Record<BeastGrade, Rarity | null> = {
  SQUIRE: Rarity.E,
  KNIGHT: Rarity.C,
  MASTER: Rarity.A,
  KING: Rarity.SS,
  SACRED: null,
}

export function beastSaleValue(grade: BeastGrade): number | null {
  const rarity = BEAST_GRADE_RARITY[grade]
  return rarity ? RARITY_SALE_VALUE[rarity] : null
}

/** % dos stats do dono para a besta em campo (Dominância e Mestre). */
export function beastStatPercent(
  contract: 'DOMINANCE' | 'MASTER',
  grade: BeastGrade
): number {
  const table = BEAST_STAT_PERCENT[contract]
  return grade === BeastGrade.SACRED ? table.KING * SACRED_FACTOR : table[grade]
}

export function beastDuration(grade: BeastGrade): number {
  return grade === BeastGrade.SACRED
    ? BEAST_DURATION.sacred
    : BEAST_DURATION.normal
}
