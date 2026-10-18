/** Linhagem (D25). Espelha o enum `Lineage` do Prisma, sem depender dele. */
export const Lineage = {
  FUNDAMENTAL: 'FUNDAMENTAL',
  ELEMENTAL: 'ELEMENTAL',
  MATERIAL: 'MATERIAL',
  VECTORIAL: 'VECTORIAL',
  PSYCHIC: 'PSYCHIC',
  BIOLOGICAL: 'BIOLOGICAL',
  NONE: 'NONE',
} as const

export type Lineage = (typeof Lineage)[keyof typeof Lineage]
