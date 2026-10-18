/** Periculosidade (D86): Discreto a Caótico. O modelo define a inicial; a instância sobe. */
export const DangerLevel = {
  DISCRETE: 'DISCRETE',
  CONTINUOUS: 'CONTINUOUS',
  DIFFERENTIABLE: 'DIFFERENTIABLE',
  NON_LINEAR: 'NON_LINEAR',
  CHAOTIC: 'CHAOTIC',
} as const

export type DangerLevel = (typeof DangerLevel)[keyof typeof DangerLevel]
