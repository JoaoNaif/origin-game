import { Rarity } from '@/domain/characters/enums/rarity'
import { Fragments } from './fragments'

/** O que a conta ganhou no fim da batalha, além do XP (D100, D104, D150). Guardado na batalha. */
export interface BattleLoot {
  coins: number
  fragments: Fragments
  /** Baú que caiu (fica fechado na conta até abrir). */
  chest: { id: string; tier: Rarity } | null
}
