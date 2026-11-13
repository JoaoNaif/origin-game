/** De onde veio o equipamento da conta. Espelha o enum `GearSource` do Prisma. */
export const GearSource = {
  CHEST: 'CHEST',
  ADMIN: 'ADMIN',
  /** Prêmio de evento (D155). */
  EVENT: 'EVENT',
} as const

export type GearSource = (typeof GearSource)[keyof typeof GearSource]
