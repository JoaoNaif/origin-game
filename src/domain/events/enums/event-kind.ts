/**
 * Tipo do evento (D155, `events_brief.md` 5). Os desta lista já rodam no motor atual; ondas, chefe mundial, ranking por
 * pontos, organização, família e equipe entram depois (8). Espelha o enum `EventKind` do Prisma.
 */
export const EventKind = {
  /** Pisos em sequência; perder não faz voltar; prêmio por piso e o principal no fim. */
  TOWER: 'TOWER',
  /** Traz um personagem novo, em geral obtido ao concluir. */
  CHARACTER_LAUNCH: 'CHARACTER_LAUNCH',
  /** Vencer dá a chance de capturar a besta da etapa. */
  HUNT: 'HUNT',
  /** Batalhas com modificadores de regra. */
  RESEARCH: 'RESEARCH',
  /** Uma tentativa só por conta: perdeu, acabou. */
  UNIQUE_BOSS: 'UNIQUE_BOSS',
} as const

export type EventKind = (typeof EventKind)[keyof typeof EventKind]
