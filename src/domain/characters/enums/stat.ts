/** Os 7 stats do personagem (D45, `character_brief.md` 2). */
export const Stat = {
  HP: 'HP',
  ATTACK: 'ATTACK',
  DEFENSE: 'DEFENSE',
  SPEED: 'SPEED',
  PRECISION: 'PRECISION',
  EVASION: 'EVASION',
  WILL: 'WILL',
} as const

export type Stat = (typeof Stat)[keyof typeof Stat]
