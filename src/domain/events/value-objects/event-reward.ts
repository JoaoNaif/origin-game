import { Lineage } from '@/domain/characters/enums/lineage'
import { Rarity } from '@/domain/characters/enums/rarity'

/**
 * Um prêmio do evento (D155, `events_brief.md` 4.1). As ligações vão pela `key` do catálogo. Traço, título e reputação
 * ficam para depois (o personagem ainda não guarda título, e as organizações não existem).
 */
export type EventReward =
  | { type: 'COINS'; amount: number }
  | { type: 'FRAGMENTS'; lineage: Lineage; amount: number }
  | { type: 'CHEST'; tier: Rarity }
  /** Personagem (em geral exclusivo, D82). Repetido vira moeda pela raridade. */
  | { type: 'CHARACTER'; templateKey: string }
  /** Equipamento vivo: ocupa 1 espaço do inventário (sem espaço, vai para a caixa). */
  | { type: 'GEAR'; gearKey: string }
  /** Besta, sem contrato: ocupa 1 espaço do inventário (sem espaço, vai para a caixa). */
  | { type: 'BEAST'; beastKey: string }

export type EventRewardType = EventReward['type']

/** Os prêmios que ocupam espaço no inventário (os que podem ir para a caixa de recompensas). */
export function takesInventorySlot(reward: EventReward): boolean {
  return reward.type === 'GEAR' || reward.type === 'BEAST'
}
