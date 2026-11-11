/** Arma ou armadura (D62): o mesmo sistema; um slot só por personagem, de qualquer um dos dois (D94). */
export const GearKind = {
  WEAPON: 'WEAPON',
  ARMOR: 'ARMOR',
} as const

export type GearKind = (typeof GearKind)[keyof typeof GearKind]
