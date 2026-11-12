/**
 * Os 3 contratos (D64, `beast_contracts_brief.md` 3): mudam o comportamento da besta. Fixo na besta do catálogo
 * (D154). Espelha o enum `BeastContract` do Prisma.
 */
export const BeastContract = {
  /** Obediente: entra em campo e a IA decide por ela; o dono perde Vontade enquanto ela está lá. */
  DOMINANCE: 'DOMINANCE',
  /** Unidade própria, o jogador escolhe a ação; pede requisitos de stats do dono. */
  MASTER: 'MASTER',
  /** Não ocupa célula: divide o dano com o dono e dá Precisão e Esquiva. */
  EQUALITY: 'EQUALITY',
} as const

export type BeastContract = (typeof BeastContract)[keyof typeof BeastContract]
