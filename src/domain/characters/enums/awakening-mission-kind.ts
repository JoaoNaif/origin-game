/** Categoria da missão oculta do despertar (D96): cada personagem sorteia uma de cada. */
export const AwakeningMissionCategory = {
  /** Soma eventos ao longo das batalhas (~100). */
  ACCUMULATIVE: 'ACCUMULATIVE',
  /** Conta batalhas em que a condição foi cumprida (~15). */
  REPEATED: 'REPEATED',
  /** Uma batalha só. */
  MILESTONE: 'MILESTONE',
} as const

export type AwakeningMissionCategory =
  (typeof AwakeningMissionCategory)[keyof typeof AwakeningMissionCategory]

/** Tipo da missão (D151): fixo no código, porque cada um é medido nos eventos da batalha. */
export const AwakeningMissionKind = {
  KILLS: 'KILLS',
  STATUS_APPLIED: 'STATUS_APPLIED',
  HEAVY_HITS: 'HEAVY_HITS',
  SUPPORT_ACTIONS: 'SUPPORT_ACTIONS',
  DAMAGE_SHARE: 'DAMAGE_SHARE',
  SUPPORT_SHARE: 'SUPPORT_SHARE',
  LAST_ALIVE_WIN: 'LAST_ALIVE_WIN',
  MULTI_KILL: 'MULTI_KILL',
  SOLE_SURVIVOR_WIN: 'SOLE_SURVIVOR_WIN',
  ENEMY_HP_SHARE: 'ENEMY_HP_SHARE',
  TRIPLE_KILL: 'TRIPLE_KILL',
} as const

export type AwakeningMissionKind =
  (typeof AwakeningMissionKind)[keyof typeof AwakeningMissionKind]

/** A categoria de cada tipo e o limiar padrão (D96, `awakening_brief.md` 7.2). */
export const AWAKENING_MISSION_KINDS: Record<
  AwakeningMissionKind,
  { category: AwakeningMissionCategory; defaultThreshold: number }
> = {
  KILLS: { category: 'ACCUMULATIVE', defaultThreshold: 100 },
  STATUS_APPLIED: { category: 'ACCUMULATIVE', defaultThreshold: 100 },
  HEAVY_HITS: { category: 'ACCUMULATIVE', defaultThreshold: 100 },
  SUPPORT_ACTIONS: { category: 'ACCUMULATIVE', defaultThreshold: 100 },
  DAMAGE_SHARE: { category: 'REPEATED', defaultThreshold: 15 },
  SUPPORT_SHARE: { category: 'REPEATED', defaultThreshold: 15 },
  LAST_ALIVE_WIN: { category: 'REPEATED', defaultThreshold: 15 },
  MULTI_KILL: { category: 'REPEATED', defaultThreshold: 15 },
  SOLE_SURVIVOR_WIN: { category: 'MILESTONE', defaultThreshold: 1 },
  ENEMY_HP_SHARE: { category: 'MILESTONE', defaultThreshold: 1 },
  TRIPLE_KILL: { category: 'MILESTONE', defaultThreshold: 1 },
}
