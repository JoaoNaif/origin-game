import { Rng } from '@/core/rng/rng'
import { Lineage } from '@/domain/characters/enums/lineage'
import { Rarity } from '@/domain/characters/enums/rarity'
import {
  BATTLE_CHEST_DROP,
  BATTLE_COINS,
  BATTLE_FRAGMENTS,
  LOSS_CHEST_DROP_FACTOR,
} from '../economy-values'
import { addFragments, Fragments } from '../value-objects/fragments'

export interface BattleLootInput {
  won: boolean
  /** Modificador do modo (PvE: dificuldade, ×0,6 a ×1,4; o mesmo do XP, 3.1). */
  modeMultiplier: number
  /** Mesmo NPC: −10% por repetição nas últimas 10, piso ×0,4 (o mesmo do XP). */
  sameNpcMultiplier: number
  /** Linhagens das variantes de cada personagem que entrou (vazio = sem variante). */
  unitLineages: readonly (readonly Lineage[])[]
  rng: Rng
}

export interface BattleLootDraw {
  coins: number
  fragments: Fragments
  chestTier: Rarity | null
}

/**
 * Moeda, fragmentos e baú do fim da batalha (3.1, 3.5, 3.9):
 * - **Moeda:** vitória 130 / derrota 70 × modo × mesmo NPC, arredondada para baixo.
 * - **Fragmentos:** vitória 2 / derrota 1 × os mesmos modificadores; a fração vira chance de mais um. Cada fragmento
 *   sorteia um personagem da squad e, dele, uma variante (sem variante = Neutro).
 * - **Baú:** um sorteio só (E 20%, D 5%, C 1%; metade na derrota), que cai junto com a moeda contra o mesmo NPC (D150).
 */
export function battleLoot(input: BattleLootInput): BattleLootDraw {
  const { won, modeMultiplier, sameNpcMultiplier, unitLineages, rng } = input
  const multiplier = modeMultiplier * sameNpcMultiplier

  const coins = Math.floor(
    (won ? BATTLE_COINS.WIN : BATTLE_COINS.LOSS) * multiplier
  )

  const amount =
    (won ? BATTLE_FRAGMENTS.WIN : BATTLE_FRAGMENTS.LOSS) * multiplier
  const whole = Math.floor(amount)
  const count = whole + (rng.chance(amount - whole) ? 1 : 0)
  let fragments: Fragments = {}
  for (let i = 0; i < count && unitLineages.length > 0; i++) {
    const lineages = rng.pick(unitLineages)
    const type = lineages.length > 0 ? rng.pick(lineages) : Lineage.NONE
    fragments = addFragments(fragments, { [type]: 1 })
  }

  const dropFactor = (won ? 1 : LOSS_CHEST_DROP_FACTOR) * sameNpcMultiplier
  let roll = rng.next()
  let chestTier: Rarity | null = null
  for (const { tier, chance } of BATTLE_CHEST_DROP) {
    roll -= chance * dropFactor
    if (roll < 0) {
      chestTier = tier
      break
    }
  }

  return { coins, fragments, chestTier }
}
