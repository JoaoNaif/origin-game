/**
 * De onde o traço vem.
 * - TEMPLATE: já vem no modelo do personagem (família); fica na venda.
 * - CONQUERED: metas do histórico e eventos; se perde na venda.
 */
export const TraitSource = {
  TEMPLATE: 'TEMPLATE',
  CONQUERED: 'CONQUERED',
} as const

export type TraitSource = (typeof TraitSource)[keyof typeof TraitSource]
