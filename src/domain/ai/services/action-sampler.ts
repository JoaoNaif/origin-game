import { Rng } from '@/core/rng/rng'
import { SCORE_CUT } from '../ai-values'

/** Nota' = (nota − mínima) ÷ (máxima − mínima); todas iguais viram 1 (10.1). */
export function normalizeScores(scores: readonly number[]): number[] {
  const min = Math.min(...scores)
  const max = Math.max(...scores)
  if (max - min < 1e-9) return scores.map(() => 1)

  return scores.map((s) => (s - min) / (max - min))
}

const TIE = 1e-9

/**
 * Escolhe o índice da ação (D90, `pvp_brief.md` 8.1 e 10.1): as abaixo do corte (0,2) nunca saem; entre as outras,
 * `p ∝ exp(nota' / T)`. Com `T = 0` (Grão-mestre), sempre a melhor, desempate pela Rng. Usa sempre **um** número da
 * Rng, para a sequência não depender de quantas ações havia.
 */
export function sampleAction(
  scores: readonly number[],
  temperature: number,
  rng: Rng
): number {
  const best = Math.max(...scores)
  const eligible = scores
    .map((score, index) => ({ score, index }))
    .filter(({ score }) => score >= SCORE_CUT || score >= best - TIE)

  if (temperature <= 0) {
    const top = eligible.filter(({ score }) => score >= best - TIE)
    return rng.pick(top).index
  }

  const weights = eligible.map(({ score }) =>
    Math.exp((score - best) / temperature)
  )
  const total = weights.reduce((a, b) => a + b, 0)
  let draw = rng.next() * total

  for (let i = 0; i < eligible.length; i++) {
    draw -= weights[i]
    if (draw < 0) return eligible[i].index
  }

  return eligible[eligible.length - 1].index
}
