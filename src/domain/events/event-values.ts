import { BeastGrade } from '@/domain/beasts/enums/beast-grade'

/**
 * Valores dos eventos (D155, `events_brief.md`). Placeholders aprovados, a ajustar jogando.
 */

/** Chance de captura ao vencer a etapa da caça, pelo grau da besta (5.1). A sagrada não sai de caça. */
export const HUNT_CAPTURE_CHANCE: Record<
  Exclude<BeastGrade, 'SACRED'>,
  number
> = {
  SQUIRE: 1,
  KNIGHT: 0.6,
  MASTER: 0.35,
  KING: 0.2,
}

/** +10 pontos de chance a cada falha de captura no mesmo evento (5.1); zera quando o evento acaba. */
export const HUNT_FAILURE_BONUS = 0.1

/** Dias que a recompensa pendente fica na caixa antes de sumir (4.4). */
export const REWARD_BOX_DAYS = 14

/** Limites do que o admin monta (sanidade, não regra de jogo). */
export const EVENT_LIMITS = {
  maxStages: 30,
  maxRewardsPerList: 10,
  maxRequirements: 10,
  maxAttempts: 100,
  maxCoins: 1_000_000,
  maxFragments: 500,
} as const

/** Chance de captura com as falhas anteriores (teto 100%). */
export function huntCaptureChance(
  grade: Exclude<BeastGrade, 'SACRED'>,
  failures: number
): number {
  return Math.min(1, HUNT_CAPTURE_CHANCE[grade] + HUNT_FAILURE_BONUS * failures)
}
