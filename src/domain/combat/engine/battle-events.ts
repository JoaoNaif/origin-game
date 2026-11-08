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
      /** Status que seguem valendo neste turno (depois de baixar as durações); ausente = nenhum. */
      statuses?: StatusType[]
    }
  | { type: 'SKIP'; ref: string; reason: 'STUN' | 'SLEEP' }
  /** Adormecido levou dano e acordou (D146). */
  | { type: 'WOKE'; ref: string }
  /** Purificar (D146): `status` é o que saiu; nulo se não havia nada para tirar. */
  | {
      type: 'CLEANSE'
      ref: string
      targetRef: string
      status: StatusType | null
    }
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
      /** HP do alvo depois do golpe (feitos do DOM: o escudo que salvou, D152). */
      hpLeft?: number
      /** Status do alvo antes do golpe de skill; ausente = nenhum. */
      targetStatuses?: StatusType[]
      /** Parte do dano que veio pelo Ligado (D146). */
      linked?: boolean
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
  /**
   * `ref` em MODIFIER, STATUS, LOCK e TURN_SHIFT: quem causou (skill ou passiva), para o XP de buff/debuff (D147). Sem
   * `ref` é regra do motor (custo de mover, Contágio, a outra ponta do Ligado).
   */
  | {
      type: 'MODIFIER'
      ref?: string
      targetRef: string
      stat: Stat
      percent: number
      result: string
    }
  | {
      type: 'STATUS'
      ref?: string
      targetRef: string
      status: StatusType
      result: StatusApplication | 'RESISTED'
    }
  | { type: 'LOCK'; ref?: string; targetRef: string; skillKey: string }
  | {
      type: 'MOVE'
      ref: string
      to: GridPosition
      forced: boolean
    }
  | { type: 'MOVE_BLOCKED'; ref: string; reason: 'RESISTED' | 'BLOCKED' }
  | { type: 'TURN_SHIFT'; ref?: string; targetRef: string; percent: number }
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
  /** Indestrutível (DOM, D93): `targetRef` não leva dano até o próximo turno dele. */
  | { type: 'INVULNERABLE'; ref: string; targetRef: string }
  | { type: 'DEFEATED'; ref: string }
  | { type: 'ROUND_END'; round: number }
  | {
      type: 'BATTLE_END'
      winner: BattleSide
      reason: BattleEndReason
      round: number
    }
