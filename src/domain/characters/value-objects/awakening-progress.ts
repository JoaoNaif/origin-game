import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { AwakeningMissionKind } from '../enums/awakening-mission-kind'

/** Uma missão oculta do personagem, com o limiar já ajustado (sangue puro) e o progresso. */
export interface AwakeningMissionProgress {
  kind: AwakeningMissionKind
  threshold: number
  progress: number
}

/** O despertar sorteado (D151) e as 3 missões dele. O jogador não vê nada disso, só a dica. */
export interface AwakeningProgress {
  awakeningId: UniqueEntityId
  drawnAt: Date
  missions: AwakeningMissionProgress[]
}

/** O que a batalha mediu de um personagem para as missões (`awakeningBattleStats` no motor). */
export interface AwakeningBattleStats {
  kills: number
  statusApplied: number
  heavyHits: number
  supportActions: number
  /** Fração do dano da squad (0 a 1). */
  damageShare: number
  /** Fração da cura e escudo da squad (0 a 1). */
  supportShare: number
  /** Venceu e ele é o último vivo. */
  lastAliveWin: boolean
  /** Fração do HP total do lado inimigo que ele causou (0 a 1 ou mais). */
  enemyHpShare: number
}
