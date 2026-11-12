/** Grau da besta (D95): os 4 do equipamento e a sagrada acima. Espelha o enum `BeastGrade` do Prisma. */
export const BeastGrade = {
  SQUIRE: 'SQUIRE',
  KNIGHT: 'KNIGHT',
  MASTER: 'MASTER',
  KING: 'KING',
  SACRED: 'SACRED',
} as const

export type BeastGrade = (typeof BeastGrade)[keyof typeof BeastGrade]
