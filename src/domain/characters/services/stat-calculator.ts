import { Stat } from '../enums/stat'
import { StatBlock } from '../value-objects/stat-block'
import { TraitEffect } from '../value-objects/trait-effect'
import { BASE_SHARE, HP_PER_POINT } from './free-points'
import { MAX_LEVEL } from './level-curve'
import { TRAIT_STAT_CAP_PERCENT } from './trait-rules'

/**
 * Fração da base no nível 0 (D91): a base é 85% do perfil e começa em 40% dela, ou seja, 34% do perfil no nível 0,
 * crescendo em linha reta até 85% no nível 100.
 */
export const BASE_GROWTH_AT_LEVEL_0 = 0.4

export interface StatInput {
  /** Perfil do modelo no nível 100 (já com a distribuição padrão dos pontos livres). */
  profile: StatBlock
  level: number
  /** Pontos livres por stat (HP em pontos: 1 ponto = 5 de HP). */
  freePoints: StatBlock
  /** Efeitos dos traços que valem para este personagem (o de família só se ele tiver a variante). */
  traitEffects?: readonly TraitEffect[]
}

/** Crescimento da base no nível (0,40 no nível 0 até 1,0 no 100). */
export function baseGrowth(level: number): number {
  const clamped = Math.min(Math.max(level, 0), MAX_LEVEL)

  return (
    BASE_GROWTH_AT_LEVEL_0 +
    (1 - BASE_GROWTH_AT_LEVEL_0) * (clamped / MAX_LEVEL)
  )
}

/**
 * Soma dos % de traço por stat. Os bônus positivos param no teto de +15% (D88); os negativos (lado ruim de um
 * traço, ex.: Berserker) entram inteiros.
 */
export function traitPercents(effects: readonly TraitEffect[]): StatBlock {
  const positive = emptyBlock()
  const negative = emptyBlock()

  for (const effect of effects) {
    if (effect.type !== 'STAT_MODIFIER') continue

    if (effect.percent > 0) positive[effect.stat] += effect.percent
    else negative[effect.stat] += effect.percent
  }

  return mapBlock(
    (stat) => Math.min(positive[stat], TRAIT_STAT_CAP_PERCENT) + negative[stat]
  )
}

/**
 * Stats do personagem fora de batalha (antes de buffs, debuffs e Desgaste), arredondados para inteiro (D91):
 * `(perfil × 85% × crescimento do nível + pontos livres) × (1 + % dos traços)`.
 * DOM e equipamento vivo entram aqui quando essas camadas chegarem.
 */
export function computeStats(input: StatInput): StatBlock {
  const growth = baseGrowth(input.level)
  const percents = traitPercents(input.traitEffects ?? [])

  return mapBlock((stat) => {
    const base = input.profile[stat] * BASE_SHARE * growth
    const free =
      stat === Stat.HP
        ? input.freePoints[stat] * HP_PER_POINT
        : input.freePoints[stat]

    return Math.round((base + free) * (1 + percents[stat] / 100))
  })
}

function emptyBlock(): StatBlock {
  return mapBlock(() => 0)
}

function mapBlock(fn: (stat: Stat) => number): StatBlock {
  return Object.fromEntries(
    Object.values(Stat).map((stat) => [stat, fn(stat)])
  ) as StatBlock
}
