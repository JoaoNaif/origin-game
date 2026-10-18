/** Tipo (força) da skill (D92): Básica a Final. */
export const SkillTier = {
  BASIC: 'BASIC',
  STANDARD: 'STANDARD',
  REINFORCED: 'REINFORCED',
  STRONG: 'STRONG',
  FINAL: 'FINAL',
} as const

export type SkillTier = (typeof SkillTier)[keyof typeof SkillTier]

export interface SkillTierReference {
  power: number
  cooldown: number
  /** % do stat base da linhagem. */
  desgastePercent: number
  minLevel: number
}

/** Valores de referência por tipo, alvo único corpo a corpo (`skills_brief.md` 12.1). */
export const SKILL_TIER_REFERENCE: Record<SkillTier, SkillTierReference> = {
  BASIC: { power: 0.8, cooldown: 0, desgastePercent: 1, minLevel: 0 },
  STANDARD: { power: 1.0, cooldown: 1, desgastePercent: 1.5, minLevel: 0 },
  REINFORCED: { power: 1.3, cooldown: 2, desgastePercent: 3, minLevel: 20 },
  STRONG: { power: 1.6, cooldown: 3, desgastePercent: 5, minLevel: 40 },
  FINAL: { power: 2.0, cooldown: 4, desgastePercent: 8, minLevel: 60 },
}

/** Teto de Poder de qualquer skill (Final despertada, D96). */
export const MAX_SKILL_POWER = 2.5

/** Nível mínimo das skills despertadas (D96). */
export const AWAKENED_MIN_LEVEL = 80
