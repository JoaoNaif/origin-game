/** Elo entre o portador e o equipamento (`living_gear_brief.md` 4): pleno, parcial ou sem elo. */
export const GearBond = {
  FULL: 'FULL',
  PARTIAL: 'PARTIAL',
  NONE: 'NONE',
} as const

export type GearBond = (typeof GearBond)[keyof typeof GearBond]
