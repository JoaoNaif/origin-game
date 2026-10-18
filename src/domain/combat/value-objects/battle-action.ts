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
    }
  /** Move para uma célula adjacente (custa o turno, D42). */
  | { type: 'MOVE'; to: GridPosition }
  /** Troca de lugar com um aliado (os dois perdem a ação, D42). */
  | { type: 'SWAP'; withRef: string }
  /** Defender (D38): sem skill possível, ou tempo esgotado. */
  | { type: 'DEFEND' }

export interface BattleActionRecord {
  /** Ordem da ação na batalha (0, 1, 2...). */
  sequence: number
  round: number
  side: BattleSide
  /** Unidade que agiu (`SnapshotUnit.ref`). */
  actorRef: string
  payload: BattleActionPayload
}
