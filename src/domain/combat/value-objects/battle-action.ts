import { GridPosition } from '@/domain/squads/value-objects/grid-position'
import { BattleSide } from '../enums/battle-enums'

/**
 * Decisão tomada num turno (só a entrada; o resultado o motor reproduz pela seed). Guardada como JSON no
 * `payload` de `BattleAction`.
 */
export type BattleActionPayload =
  /** Usa uma skill da build mirando uma célula do lado alvo. */
  | {
      type: 'SKILL'
      skillKey: string
      targetSide: BattleSide
      target: GridPosition
      /** Trocar inimigos (D111): o inimigo adjacente ao alvo com quem ele troca de lugar. */
      swapWith?: GridPosition
      /** Avançar/recuar (DASH) e mover aliado (MOVE_ALLY): a célula de destino. */
      moveTo?: GridPosition
      /** Trocar campo (D98): o campo escolhido, do catálogo da batalha. */
      fieldKey?: string
    }
  /** Move para uma célula adjacente (custa o turno, D42). */
  | { type: 'MOVE'; to: GridPosition }
  /** Troca de lugar com um aliado (os dois perdem a ação, D42). */
  | { type: 'SWAP'; withRef: string }
  /**
   * Defender (D38): só sem skill possível, ou com o tempo esgotado (`timeout`, Defender automático do servidor,
   * `pvp_brief.md` 2). Com skill possível e sem `timeout`, o motor recusa (D122).
   */
  | { type: 'DEFEND'; timeout?: boolean }

export interface BattleActionRecord {
  /** Ordem da ação na batalha (0, 1, 2...). */
  sequence: number
  round: number
  side: BattleSide
  /** Unidade que agiu (`SnapshotUnit.ref`). */
  actorRef: string
  payload: BattleActionPayload
}
