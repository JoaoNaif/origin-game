/** Modo da partida (`pvp_brief.md` 4). No MVP só existe PVE (D75). */
export const BattleMode = {
  PVE: 'PVE',
  CASUAL: 'CASUAL',
  RANKED: 'RANKED',
  FRIENDLY: 'FRIENDLY',
} as const

export type BattleMode = (typeof BattleMode)[keyof typeof BattleMode]

export const BattleStatus = {
  IN_PROGRESS: 'IN_PROGRESS',
  FINISHED: 'FINISHED',
} as const

export type BattleStatus = (typeof BattleStatus)[keyof typeof BattleStatus]

/** Lado na batalha: o jogador dono da partida e o adversário (máquina no PvE). */
export const BattleSide = {
  PLAYER: 'PLAYER',
  OPPONENT: 'OPPONENT',
} as const

export type BattleSide = (typeof BattleSide)[keyof typeof BattleSide]

/**
 * Como a batalha terminou (D31, D72): eliminação, fim forçado na rodada 30 (mais % de HP; empate pelo menor
 * Desgaste e depois pela seed, então sempre há vencedor) ou abandono (W.O.).
 */
export const BattleEndReason = {
  ELIMINATION: 'ELIMINATION',
  ROUND_LIMIT: 'ROUND_LIMIT',
  ABANDON: 'ABANDON',
} as const

export type BattleEndReason =
  (typeof BattleEndReason)[keyof typeof BattleEndReason]

/** Tipo de decisão tomada no turno (D19, D38, D42). */
export const BattleActionType = {
  SKILL: 'SKILL',
  MOVE: 'MOVE',
  SWAP: 'SWAP',
  DEFEND: 'DEFEND',
} as const

export type BattleActionType =
  (typeof BattleActionType)[keyof typeof BattleActionType]

/** Fim forçado da batalha (D72). */
export const MAX_ROUNDS = 30
