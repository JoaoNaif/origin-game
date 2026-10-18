import { Trait } from '../entities/trait'
import { Stat } from '../enums/stat'

/** Limite de traços por personagem (D39), contando o de família (D105). */
export const MAX_TRAITS = 5

/** Teto da soma dos traços num mesmo stat (D88), em %. */
export const TRAIT_STAT_CAP_PERCENT = 15

/** Stats em que a soma dos bônus positivos de traço passa do teto (D88). */
export function statsOverTraitCap(traits: readonly Trait[]): Stat[] {
  const totals = new Map<Stat, number>()

  for (const trait of traits) {
    for (const effect of trait.effects) {
      if (effect.type === 'STAT_MODIFIER' && effect.percent > 0) {
        totals.set(effect.stat, (totals.get(effect.stat) ?? 0) + effect.percent)
      }
    }
  }

  return [...totals]
    .filter(([, total]) => total > TRAIT_STAT_CAP_PERCENT)
    .map(([stat]) => stat)
}
