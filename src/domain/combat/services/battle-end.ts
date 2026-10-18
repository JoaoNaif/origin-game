import { Rng } from '@/core/rng/rng'
import { BattleEndReason, BattleSide, MAX_ROUNDS } from '../enums/battle-enums'

/** A Exaustão começa depois desta rodada (11.8, D92): a partir da 21. */
export const EXHAUSTION_AFTER_ROUND = 20

/** Por rodada de Exaustão: cura −10% e dano +5% (12.5, placeholders aprovados). */
export const EXHAUSTION_HEAL_STEP = 0.1
export const EXHAUSTION_DAMAGE_STEP = 0.05

/** Quantas rodadas de Exaustão já valem (0 até a 20; 1 na 21; 10 na 30). */
export function exhaustionStep(round: number): number {
  return Math.max(0, round - EXHAUSTION_AFTER_ROUND)
}

/** Multiplicador da cura (e do escudo concedido) na rodada: chega a 0 na 30. */
export function healMultiplier(round: number): number {
  return Math.max(0, 1 - EXHAUSTION_HEAL_STEP * exhaustionStep(round))
}

/** Multiplicador do dano na rodada: +50% na 30. */
export function damageMultiplier(round: number): number {
  return 1 + EXHAUSTION_DAMAGE_STEP * exhaustionStep(round)
}

/** A batalha termina à força quando a rodada 30 fecha (D72, D106). */
export function isForcedEnd(completedRound: number): boolean {
  return completedRound >= MAX_ROUNDS
}

export interface SideSummary {
  side: BattleSide
  /** HP atual e HP máximo **do início da batalha** de cada unidade (derrotado = 0). */
  units: readonly { hp: number; startingMaxHp: number }[]
  /** Desgaste acumulado do lado (soma de `DesgasteState.totalFraction`). */
  desgaste: number
}

export interface BattleOutcome {
  winner: BattleSide
  reason: BattleEndReason
}

const EPSILON = 1e-9

/** % do HP total do lado: HP atual somado ÷ HP máximo do início somado. */
export function hpShare(side: SideSummary): number {
  const max = side.units.reduce((sum, u) => sum + u.startingMaxHp, 0)
  const hp = side.units.reduce((sum, u) => sum + Math.max(0, u.hp), 0)

  return max > 0 ? hp / max : 0
}

/** Vitória por eliminação (D31): o lado sem ninguém vivo perde. `null` = a batalha continua. */
export function checkElimination(
  player: SideSummary,
  opponent: SideSummary,
  rng: Rng
): BattleOutcome | null {
  const playerOut = player.units.every((u) => u.hp <= 0)
  const opponentOut = opponent.units.every((u) => u.hp <= 0)

  if (!playerOut && !opponentOut) return null
  if (playerOut && opponentOut) {
    // os dois zerados no mesmo evento (raro): desempata como o fim forçado
    return {
      ...tiebreak(player, opponent, rng),
      reason: BattleEndReason.ELIMINATION,
    }
  }

  return {
    winner: playerOut ? BattleSide.OPPONENT : BattleSide.PLAYER,
    reason: BattleEndReason.ELIMINATION,
  }
}

/**
 * Fim forçado na rodada 30 (D72): vence quem tem **mais % de HP total**; empate, o de **menor Desgaste** acumulado;
 * empate ainda, a **seed**. Sempre há vencedor.
 */
export function forcedEnd(
  player: SideSummary,
  opponent: SideSummary,
  rng: Rng
): BattleOutcome {
  const difference = hpShare(player) - hpShare(opponent)

  if (Math.abs(difference) > EPSILON) {
    return {
      winner: difference > 0 ? BattleSide.PLAYER : BattleSide.OPPONENT,
      reason: BattleEndReason.ROUND_LIMIT,
    }
  }

  return {
    ...tiebreak(player, opponent, rng),
    reason: BattleEndReason.ROUND_LIMIT,
  }
}

function tiebreak(
  player: SideSummary,
  opponent: SideSummary,
  rng: Rng
): { winner: BattleSide } {
  const difference = player.desgaste - opponent.desgaste

  if (Math.abs(difference) > EPSILON) {
    return { winner: difference < 0 ? BattleSide.PLAYER : BattleSide.OPPONENT }
  }

  return { winner: rng.pick([BattleSide.PLAYER, BattleSide.OPPONENT]) }
}
