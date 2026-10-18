/**
 * Como o personagem aprendeu a skill.
 * - KIT: kit básico, desde o nível 0 (D50, D92).
 * - OFFER: escolhida num bloco de 3 a cada 5 níveis (D77), inclusive as despertadas (D96).
 */
export const CharacterSkillSource = {
  KIT: 'KIT',
  OFFER: 'OFFER',
} as const

export type CharacterSkillSource =
  (typeof CharacterSkillSource)[keyof typeof CharacterSkillSource]
