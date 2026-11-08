/** Papel de um feito do DOM (`dom_brief.md` 4): cada pilar tem um feito por papel, para nenhuma classe dominar. */
export const DomRole = {
  DAMAGE: 'DAMAGE',
  TANK: 'TANK',
  SUPPORT: 'SUPPORT',
  CONTROL: 'CONTROL',
} as const

export type DomRole = (typeof DomRole)[keyof typeof DomRole]
