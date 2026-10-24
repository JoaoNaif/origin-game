/** As 8 classes (D69, `classes_brief.md`). */
export const CharacterClass = {
  VANGUARD: 'VANGUARD',
  MARKSMAN: 'MARKSMAN',
  EXECUTOR: 'EXECUTOR',
  CONTROLLER: 'CONTROLLER',
  SUPPORT: 'SUPPORT',
  ARTILLERY: 'ARTILLERY',
  GUARDIAN: 'GUARDIAN',
  TACTICIAN: 'TACTICIAN',
} as const

export type CharacterClass =
  (typeof CharacterClass)[keyof typeof CharacterClass]

/** Orçamento de poder no nível 100 (HP/5 + demais stats). Artilharia é menor pela área (D69). */
export const CLASS_BUDGET: Record<CharacterClass, number> = {
  VANGUARD: 670,
  MARKSMAN: 670,
  EXECUTOR: 640,
  CONTROLLER: 700,
  SUPPORT: 670,
  ARTILLERY: 640,
  GUARDIAN: 670,
  TACTICIAN: 700,
}

/** Tolerância do orçamento por personagem (o admin ajusta stats dentro da classe). */
export const CLASS_BUDGET_TOLERANCE = 0.03
