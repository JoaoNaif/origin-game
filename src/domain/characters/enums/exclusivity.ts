/** Exclusividade do modelo (D82): exclusivo não vem de baú nem pode ser vendido. */
export const Exclusivity = {
  NONE: 'NONE',
  EVENT: 'EVENT',
  RANKING: 'RANKING',
} as const

export type Exclusivity = (typeof Exclusivity)[keyof typeof Exclusivity]
