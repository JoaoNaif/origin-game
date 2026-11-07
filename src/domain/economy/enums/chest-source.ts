/** De onde veio o baú (D79). Espelha o enum `ChestSource` do Prisma. */
export const ChestSource = {
  PURCHASE: 'PURCHASE',
  BATTLE: 'BATTLE',
} as const

export type ChestSource = (typeof ChestSource)[keyof typeof ChestSource]
