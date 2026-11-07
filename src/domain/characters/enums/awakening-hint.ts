/** O que o jogador vê do despertar (D67, `awakening_brief.md` 3.3): nunca qual é, nem as missões. */
export const AwakeningHint = {
  /** Antes do sorteio, sem despertar possível ou sem missão cumprida. */
  SILENT: 'SILENT',
  /** 1 missão cumprida: "algo desperta". */
  SIGNS: 'SIGNS',
  /** 2 missões cumpridas: está perto. */
  IMMINENT: 'IMMINENT',
  AWAKENED: 'AWAKENED',
} as const

export type AwakeningHint = (typeof AwakeningHint)[keyof typeof AwakeningHint]
