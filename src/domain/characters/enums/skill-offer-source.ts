/** De onde veio o bloco de skills: a subida de nível (D77) ou a recuperação ao despertar (D151). */
export const SkillOfferSource = {
  LEVEL_UP: 'LEVEL_UP',
  AWAKENING: 'AWAKENING',
} as const

export type SkillOfferSource =
  (typeof SkillOfferSource)[keyof typeof SkillOfferSource]
