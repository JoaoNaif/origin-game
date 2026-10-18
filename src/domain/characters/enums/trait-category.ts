/** Categoria do traço (D47). O campo de batalha pode pedir uma categoria inteira. */
export const TraitCategory = {
  COMBAT: 'COMBAT',
  POSTURE: 'POSTURE',
  ORIGIN: 'ORIGIN',
} as const

export type TraitCategory = (typeof TraitCategory)[keyof typeof TraitCategory]
