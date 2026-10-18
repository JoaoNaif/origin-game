/** Raridade do modelo (D86): mede dificuldade de obter, não poder. */
export const Rarity = {
  E: 'E',
  D: 'D',
  C: 'C',
  B: 'B',
  A: 'A',
  S: 'S',
  SS: 'SS',
} as const

export type Rarity = (typeof Rarity)[keyof typeof Rarity]
