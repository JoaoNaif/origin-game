/** Dificuldade da IA (D90): muda a qualidade da decisão, nunca dá bônus de stat. */
export const AiDifficulty = {
  BEGINNER: 'BEGINNER',
  INTERMEDIATE: 'INTERMEDIATE',
  ADVANCED: 'ADVANCED',
  MASTER: 'MASTER',
  GRANDMASTER: 'GRANDMASTER',
} as const

export type AiDifficulty = (typeof AiDifficulty)[keyof typeof AiDifficulty]

/** Faixa de nível dos NPCs por dificuldade, inclusiva (D103, `pvp_brief.md` 10.3). */
export const NPC_LEVEL_RANGE: Record<
  AiDifficulty,
  { min: number; max: number }
> = {
  BEGINNER: { min: 10, max: 25 },
  INTERMEDIATE: { min: 25, max: 45 },
  ADVANCED: { min: 45, max: 70 },
  MASTER: { min: 70, max: 90 },
  GRANDMASTER: { min: 90, max: 100 },
}
