/** Tipo de alcance da skill (`skills_brief.md` 11.1). Os traços olham para isto. */
export const SkillRange = {
  MELEE: 'MELEE',
  RANGED: 'RANGED',
  PIERCING: 'PIERCING',
  FLANK: 'FLANK',
} as const

export type SkillRange = (typeof SkillRange)[keyof typeof SkillRange]
