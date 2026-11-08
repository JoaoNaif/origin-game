import { DomChange } from '@/domain/characters/value-objects/dom-state'

/** O que um personagem ganhou no fim da batalha (D134, D135). Guardado na batalha para o histórico e a reconexão. */
export interface BattleReward {
  characterId: string
  xp: number
  levelsGained: number
  /** O nível depois do XP. */
  level: number
  /** Blocos de skill que a subida abriu (D77), mais os de recuperação se despertou (D151). */
  newSkillOffers: number
  /** Despertou nesta batalha (D151): o jogador só fica sabendo agora. */
  awakened?: boolean
  /** Pilares do DOM que subiram ou caíram nesta batalha (D152). */
  domChanges?: DomChange[]
}
