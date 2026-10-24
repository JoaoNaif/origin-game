/** O que um personagem ganhou no fim da batalha (D134, D135). Guardado na batalha para o histórico e a reconexão. */
export interface BattleReward {
  characterId: string
  xp: number
  levelsGained: number
  /** O nível depois do XP. */
  level: number
  /** Blocos de skill que a subida abriu (D77). */
  newSkillOffers: number
}
