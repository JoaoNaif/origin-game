/** Nível de um pilar do DOM (D60), do menor para o maior. Sem nível = o personagem não tem o pilar. */
export const DomLevel = {
  BASIC: 'BASIC',
  INTERMEDIATE: 'INTERMEDIATE',
  /** Dá o título e a skill única do pilar. */
  ADVANCED: 'ADVANCED',
} as const

export type DomLevel = (typeof DomLevel)[keyof typeof DomLevel]
