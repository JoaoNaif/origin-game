/** Grau do equipamento vivo (`living_gear_brief.md` 3): quanto do poder da variante o material usa. */
export const GearGrade = {
  SQUIRE: 'SQUIRE',
  KNIGHT: 'KNIGHT',
  MASTER: 'MASTER',
  KING: 'KING',
  DIVINE: 'DIVINE',
} as const

export type GearGrade = (typeof GearGrade)[keyof typeof GearGrade]
