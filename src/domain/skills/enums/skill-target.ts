/** Quem a skill atinge. Aliado e si mesmo não sofrem bloqueio nem têm teste de acerto. */
export const SkillTarget = {
  ENEMY: 'ENEMY',
  ALLY: 'ALLY',
  SELF: 'SELF',
} as const

export type SkillTarget = (typeof SkillTarget)[keyof typeof SkillTarget]
