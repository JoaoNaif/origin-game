import { Stat } from '../enums/stat'

/** Os 7 stats como números (D45). */
export type StatBlock = Record<Stat, number>

/** Orçamento de poder: HP conta 1/5 (D69). */
export function statBudget(stats: StatBlock): number {
  return (
    stats.HP / 5 +
    stats.ATTACK +
    stats.DEFENSE +
    stats.SPEED +
    stats.PRECISION +
    stats.EVASION +
    stats.WILL
  )
}
