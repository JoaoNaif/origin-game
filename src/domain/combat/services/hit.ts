import { Rng } from '@/core/rng/rng'

/** Piso da chance de acerto (D91): nenhum alvo fica inacertável. */
export const HIT_CHANCE_FLOOR = 0.3

/** Teto da chance de acerto (D91): contra Esquiva baixa, a skill pode acertar sempre. */
export const HIT_CHANCE_CAP = 1

/** Teto da chance de aplicar status (D92): nenhum status é garantido. */
export const STATUS_CHANCE_CAP = 0.9

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

/** Disputa de dois stats na mesma forma (D68): `base × 2 × ataque / (ataque + defesa)`. */
function contest(base: number, attackerStat: number, defenderStat: number) {
  return (base * 2 * attackerStat) / (attackerStat + defenderStat)
}

/**
 * Chance de acerto (D68, D91): `base da skill × 2 × Precisão / (Precisão + Esquiva)`, entre 30% e 100%.
 * Com stats iguais a chance é a própria base (0,8 na skill normal).
 */
export function hitChance(
  baseHitChance: number,
  precision: number,
  evasion: number
): number {
  return clamp(
    contest(baseHitChance, precision, evasion),
    HIT_CHANCE_FLOOR,
    HIT_CHANCE_CAP
  )
}

/**
 * Chance de aplicar um status (D92, `skills_brief.md` 11.9): `base do status × 2 × Precisão / (Precisão + Vontade)`,
 * entre 30% e 90%.
 */
export function statusChance(
  baseChance: number,
  precision: number,
  will: number
): number {
  return clamp(
    contest(baseChance, precision, will),
    HIT_CHANCE_FLOOR,
    STATUS_CHANCE_CAP
  )
}

/** Sorteio pela seed (D8): `true` com probabilidade `chance`. Chance 1 nunca falha. */
export function roll(rng: Rng, chance: number): boolean {
  if (chance >= 1) return true

  return rng.chance(chance)
}
