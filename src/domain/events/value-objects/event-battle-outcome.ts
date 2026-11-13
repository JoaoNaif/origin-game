import { EventReward } from './event-reward'

/** Como um prêmio do evento chegou à conta (guardado na batalha, como o XP e o loot). */
export type GrantedEventReward =
  | { reward: EventReward; status: 'DELIVERED'; refId: string | null }
  /** Personagem repetido: virou moeda pela raridade (D82, `progression_brief.md` 3.3). */
  | { reward: EventReward; status: 'CONVERTED'; coins: number }
  /** Não coube no inventário: foi para a caixa (`events_brief.md` 4.4). `expiresAt` em ISO. */
  | {
      reward: EventReward
      status: 'PENDING'
      pendingId: string
      expiresAt: string
    }
  /** A `key` saiu do catálogo depois que o evento foi criado: nada a entregar. */
  | { reward: EventReward; status: 'MISSING' }

/** De onde veio o prêmio. */
export type EventRewardSource =
  'STAGE' | 'COMPLETION' | 'PARTICIPATION' | 'CAPTURE'

/** O que a batalha do evento rendeu no evento (D155), além do XP e do loot de sempre. */
export interface EventBattleOutcome {
  eventKey: string
  /** A etapa jogada (base 0). */
  stage: number
  won: boolean
  /** Venceu e a etapa contou (na caça, só se capturou). */
  stageCleared: boolean
  /** Caça: a tentativa de captura (nulo fora da caça ou na derrota). */
  capture: { beastKey: string; chance: number; captured: boolean } | null
  /** Esta vitória concluiu o evento. */
  completed: boolean
  rewards: (GrantedEventReward & { source: EventRewardSource })[]
}
