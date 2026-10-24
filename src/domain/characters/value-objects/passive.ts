import { StatusType } from '@/domain/skills/enums/status-type'
import { Stat } from '../enums/stat'

/**
 * Passiva do modelo de personagem (D78, D83). Uma por personagem, fixa no modelo, guardada como JSON.
 * O gatilho cobre os 4 formatos: permanente (ALWAYS), periódica (PERIODIC), reativa (ON_*) e condicional (HP_BELOW...).
 */
export type PassiveTrigger =
  | { type: 'ALWAYS' }
  | { type: 'PERIODIC'; everyTurns: number }
  | { type: 'TURN_START' }
  | { type: 'ON_ATTACK' }
  | { type: 'ON_HIT' }
  | { type: 'ON_KILL' }
  | { type: 'ON_HEAL' }
  | { type: 'HP_BELOW'; percent: number }
  | { type: 'ON_DESGASTE' }
  | { type: 'ON_FIELD_CHANGE' }
  | { type: 'ON_STATUS'; status: StatusType }
  /** Um aliado foi derrotado (D124). */
  | { type: 'ON_ALLY_DEFEATED' }
  /** O próprio dono foi derrotado (D124): a passiva dispara uma última vez. */
  | { type: 'ON_DEFEATED' }

export type PassiveEffect =
  | { type: 'IGNORE_SHIELD' }
  | { type: 'REDUCE_COOLDOWN'; amount: number; scope: 'RECHARGING' | 'ALL' }
  | {
      type: 'APPLY_STATUS'
      status: StatusType
      target: 'SELF' | 'ATTACKER' | 'TARGET'
      chance: number
    }
  | { type: 'HEAL'; percentOfMaxHp: number }
  | { type: 'ADVANCE_TURN'; percent: number }
  /** Adianta a vez de todos os aliados vivos (sem o dono). */
  | { type: 'ADVANCE_ALLIES'; percent: number }
  | { type: 'REDUCE_DAMAGE'; percent: number }
  | { type: 'STAT_MODIFIER'; stat: Stat; percent: number }

export interface Passive {
  name: string
  description: string
  trigger: PassiveTrigger
  effects: PassiveEffect[]
}
