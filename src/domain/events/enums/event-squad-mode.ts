/** Squad do evento (D155, `events_brief.md` 3): fixo trava na primeira batalha; livre troca a cada batalha. */
export const EventSquadMode = {
  FIXED: 'FIXED',
  FREE: 'FREE',
} as const

export type EventSquadMode =
  (typeof EventSquadMode)[keyof typeof EventSquadMode]
