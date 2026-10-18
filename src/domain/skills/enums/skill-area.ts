/** Área da skill (D34): alvo único, linha, coluna ou grade inteira. */
export const SkillArea = {
  SINGLE: 'SINGLE',
  LINE: 'LINE',
  COLUMN: 'COLUMN',
  GRID: 'GRID',
} as const

export type SkillArea = (typeof SkillArea)[keyof typeof SkillArea]
