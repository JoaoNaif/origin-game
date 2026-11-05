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

/** Orçamento de poder no nível 100 (HP/5 + demais stats). Ajustado por simulação, por classe (D122, D142, D144). */
export const CLASS_BUDGET: Record<CharacterClass, number> = {
  VANGUARD: 695,
  MARKSMAN: 634,
  EXECUTOR: 617,
  CONTROLLER: 691,
  SUPPORT: 680,
  ARTILLERY: 615,
  GUARDIAN: 696,
  TACTICIAN: 706,
}

/** Tolerância do orçamento por personagem (o admin ajusta stats dentro da classe). */
export const CLASS_BUDGET_TOLERANCE = 0.03
