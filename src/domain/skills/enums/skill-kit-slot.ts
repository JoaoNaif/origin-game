/** Papel da skill no kit básico (D92): básica, padrão, função da classe, assinatura da variante. */
export const SkillKitSlot = {
  BASIC: 'BASIC',
  STANDARD: 'STANDARD',
  ROLE: 'ROLE',
  SIGNATURE: 'SIGNATURE',
} as const

export type SkillKitSlot = (typeof SkillKitSlot)[keyof typeof SkillKitSlot]
