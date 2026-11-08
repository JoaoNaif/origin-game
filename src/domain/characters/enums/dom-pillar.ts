/** Pilar do DOM (D60, `dom_brief.md` 1). A ordem é a da tela e a das skills únicas na batalha. */
export const DomPillar = {
  /** Percepção, análise, antecipação. */
  MIND: 'MIND',
  /** Resistência biológica, energia vital. */
  HEART: 'HEART',
  /** Domínio estrutural do organismo. */
  BODY: 'BODY',
  /** Presença e intenção (o mais raro). */
  AURA: 'AURA',
} as const

export type DomPillar = (typeof DomPillar)[keyof typeof DomPillar]
