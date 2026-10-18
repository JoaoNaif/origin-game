import { CharacterClass } from '../enums/character-class'
import { Stat } from '../enums/stat'
import { StatBlock } from '../value-objects/stat-block'

/** Pontos por concessão: 1,5% do orçamento ≈ 10 pontos (D91). */
export const FREE_POINTS_PER_GRANT = 10

/** Uma concessão a cada 10 níveis (D76, D91). */
export const LEVELS_PER_GRANT = 10

/** Parte do perfil que é base + crescimento; o resto (15%) são os pontos livres (D91). */
export const BASE_SHARE = 0.85

/** No orçamento o HP vale 1/5: 1 ponto livre em HP = 5 de HP (D69). */
export const HP_PER_POINT = 5

/** Stats de pico de cada classe (em negrito na tabela de `classes_brief.md` 2). */
export const CLASS_PEAK_STATS: Record<CharacterClass, Stat[]> = {
  VANGUARD: [Stat.DEFENSE],
  MARKSMAN: [Stat.PRECISION],
  EXECUTOR: [Stat.ATTACK, Stat.SPEED, Stat.EVASION],
  CONTROLLER: [Stat.WILL],
  SUPPORT: [Stat.WILL],
  ARTILLERY: [Stat.ATTACK],
  GUARDIAN: [Stat.DEFENSE, Stat.WILL],
  TACTICIAN: [Stat.SPEED],
}

/** Teto do stat final em relação ao perfil (D91). */
function capMultiplier(stat: Stat, isPeak: boolean) {
  if (!isPeak) return 1.1
  if (stat === Stat.ATTACK || stat === Stat.SPEED) return 1.15

  return 1.25
}

/** Pontos livres disponíveis no nível. */
export function availableFreePoints(level: number): number {
  return Math.floor(level / LEVELS_PER_GRANT) * FREE_POINTS_PER_GRANT
}

/**
 * Máximo de pontos livres por stat: o stat final (base 85% do perfil + pontos) não passa do teto da classe.
 * Medido na escala do nível 100, onde o perfil é definido.
 */
export function maxFreePointsPerStat(
  characterClass: CharacterClass,
  profile: StatBlock
): StatBlock {
  const peaks = CLASS_PEAK_STATS[characterClass]

  return Object.fromEntries(
    (Object.keys(profile) as Stat[]).map((stat) => {
      const value = profile[stat]
      const headroom =
        value * capMultiplier(stat, peaks.includes(stat)) - value * BASE_SHARE
      const points = stat === Stat.HP ? headroom / HP_PER_POINT : headroom

      return [stat, Math.floor(points)]
    })
  ) as StatBlock
}
