/** De onde veio a besta da conta (no MVP, só o admin; eventos depois). Espelha o enum `BeastSource` do Prisma. */
export const BeastSource = {
  ADMIN: 'ADMIN',
  EVENT: 'EVENT',
} as const

export type BeastSource = (typeof BeastSource)[keyof typeof BeastSource]
