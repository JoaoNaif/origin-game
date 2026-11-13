/** Em que momento o evento está, pelas datas (D155): anunciado (ainda não abre), aberto ou encerrado. */
export const EventPhase = {
  /** Antes do anúncio: o jogador não vê. */
  HIDDEN: 'HIDDEN',
  ANNOUNCED: 'ANNOUNCED',
  OPEN: 'OPEN',
  ENDED: 'ENDED',
} as const

export type EventPhase = (typeof EventPhase)[keyof typeof EventPhase]
