/** De onde veio o baú (D79). Espelha o enum `ChestSource` do Prisma. */
export const ChestSource = {
  PURCHASE: 'PURCHASE',
  BATTLE: 'BATTLE',
  /** Prêmio de evento (D155). */
  EVENT: 'EVENT',
} as const

export type ChestSource = (typeof ChestSource)[keyof typeof ChestSource]
