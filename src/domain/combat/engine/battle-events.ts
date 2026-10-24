import { Stat } from '@/domain/characters/enums/stat'
import { StatusType } from '@/domain/skills/enums/status-type'
import { GridPosition } from '@/domain/squads/value-objects/grid-position'
import { BattleEndReason, BattleSide } from '../enums/battle-enums'
import { StatusApplication } from '../services/conditions'

/**
 * O que aconteceu na batalha, em ordem. É o que o front exibe e o que o replay confere. Não entra no banco: o
 * banco guarda só as ações, e o motor reproduz os eventos pela seed.
 */
export type BattleEvent =
  | {
      type: 'TURN'
      ref: string
      round: number
      tick: number
      /** Ação cedida pelo Comando (não é um turno novo: sem início de turno nem recarga). */
      extra?: boolean
    }
  | { type: 'SKIP'; ref: string; reason: 'STUN' }
  | { type: 'DOT'; ref: string; amount: number }
  | { type: 'SKILL'; ref: string; skillKey: string; potency: number }
  | { type: 'INTERCEPT'; guardianRef: string; protectedRef: string }
  | { type: 'MISS'; ref: string; targetRef: string }
  | {
      type: 'DAMAGE'
      ref: string
      targetRef: string
      amount: number
      shieldAbsorbed: number
    }
  | { type: 'HEAL'; ref: string; targetRef: string; amount: number }
  | { type: 'SHIELD'; ref: string; targetRef: string; amount: number }
  /** Proteger (D124): `ref` protege `targetRef` até o próximo turno dele. */
  | { type: 'PROTECT'; ref: string; targetRef: string }
  /** Comando (D126): `targetRef` age logo depois de `ref`. */
  | { type: 'GRANT_TURN'; ref: string; targetRef: string }
  /** Executar (D125): o golpe aproveitou o status do alvo (e o tirou, se `consumed`). */
  | {
      type: 'EXPLOIT'
      targetRef: string
      status: StatusType
      consumed: boolean
    }
  /** Um golpe no protegido caiu no protetor. */
  | { type: 'PROTECTED'; protectorRef: string; protectedRef: string }
  /** Skill de recuperação: `relieved` = fração do Desgaste aliviada (soma das frações dos stats). */
  | { type: 'RECOVER'; ref: string; targetRef: string; relieved: number }
  | {
      type: 'MODIFIER'
      targetRef: string
      stat: Stat
      percent: number
      result: string
    }
  | {
      type: 'STATUS'
      targetRef: string
      status: StatusType
      result: StatusApplication | 'RESISTED'
    }
  | { type: 'LOCK'; targetRef: string; skillKey: string }
  | {
      type: 'MOVE'
      ref: string
      to: GridPosition
      forced: boolean
    }
  | { type: 'MOVE_BLOCKED'; ref: string; reason: 'RESISTED' | 'BLOCKED' }
  | { type: 'TURN_SHIFT'; targetRef: string; percent: number }
  | { type: 'DESGASTE'; ref: string; selfDamage: number }
  | { type: 'DEFEND'; ref: string }
  | { type: 'PASSIVE'; ref: string; name: string; trigger: string }
  | {
      type: 'FIELD'
      /** Campo que passou a valer; nulo = sem campo. */
      fieldKey: string | null
      /** Quem trocou; nulo = voltou ao campo inicial. */
      ref: string | null
      /** Última rodada da troca; nulo = é o campo inicial. */
      untilRound: number | null
    }
  | { type: 'DEFEATED'; ref: string }
  | { type: 'ROUND_END'; round: number }
  | {
      type: 'BATTLE_END'
      winner: BattleSide
      reason: BattleEndReason
      round: number
    }
