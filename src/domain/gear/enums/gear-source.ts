/** De onde veio o equipamento da conta. Espelha o enum `GearSource` do Prisma. */
export const GearSource = {
  CHEST: 'CHEST',
  ADMIN: 'ADMIN',
} as const

export type GearSource = (typeof GearSource)[keyof typeof GearSource]
