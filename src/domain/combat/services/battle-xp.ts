import { AiDifficulty } from '@/domain/ai/enums/ai-difficulty'
import { BattleEvent } from '../engine/battle-events'
import { BattleSide } from '../enums/battle-enums'

/** Pool de XP por batalha (D92, `progression_brief.md` 1.1): vitória 400, derrota 160. */
export const XP_POOL = { WIN: 400, LOSS: 160 } as const

/** Parte do pool dividida igual entre os 4; o resto vai pela participação (métricas). */
export const XP_EQUAL_SHARE = 0.4

/** Peso de cada métrica (D92). Buff/debuff (0,4 do ganho) ainda não entra: falta definir o "ganho" de um buff. */
export const XP_METRIC_WEIGHTS = {
  damage: 1,
  heal: 1,
  shield: 1,
  mitigation: 0.8,
  kills: 1,
} as const

/** Abate vale 10% do HP do abatido (D92). */
export const XP_KILL_HP_SHARE = 0.1

/** Retorno decrescente por métrica (D92): cada métrica entra elevada a 0,85. */
export const XP_METRIC_EXPONENT = 0.85

/** PvE por dificuldade (D92). */
export const PVE_XP_MULTIPLIER: Record<AiDifficulty, number> = {
  BEGINNER: 0.6,
  INTERMEDIATE: 0.8,
  ADVANCED: 1.0,
  MASTER: 1.2,
  GRANDMASTER: 1.4,
}

/** Mesmo NPC: −10% por repetição nas últimas 10 batalhas, piso ×0,4 (D92). */
export const SAME_NPC_XP = { window: 10, penalty: 0.1, floor: 0.4 } as const

/** Catch-up: +2% por nível abaixo da média da conta, máx. +50% (D92). */
export const CATCH_UP_XP = { perLevel: 0.02, max: 0.5 } as const

export type XpMetric = keyof typeof XP_METRIC_WEIGHTS
export type BattleMetrics = Record<XpMetric, number>

const emptyMetrics = (): BattleMetrics => ({
  damage: 0,
  heal: 0,
  shield: 0,
  mitigation: 0,
  kills: 0,
})

const sideOf = (ref: string) =>
  ref.startsWith(BattleSide.PLAYER) ? BattleSide.PLAYER : BattleSide.OPPONENT

/**
 * Métricas de participação de cada unidade de um lado, lidas dos eventos do motor: dano nos inimigos, cura e escudo
 * nos aliados, dano segurado por Interceptar/Proteger (mitigação) e abates (10% do HP máximo do abatido).
 */
export function battleMetrics(
  events: readonly BattleEvent[],
  side: BattleSide,
  maxHpOf: (ref: string) => number
): Map<string, BattleMetrics> {
  const metrics = new Map<string, BattleMetrics>()
  const of = (ref: string) => {
    let m = metrics.get(ref)
    if (!m) metrics.set(ref, (m = emptyMetrics()))
    return m
  }
  const lastHitBy = new Map<string, string>()
  /** Quem está segurando o golpe da skill em resolução (Guardião ou protetor). */
  let holders = new Set<string>()

  for (const event of events) {
    switch (event.type) {
      case 'TURN':
      case 'SKILL':
        holders = new Set()
        break
      case 'INTERCEPT':
        holders.add(event.guardianRef)
        break
      case 'PROTECTED':
        holders.add(event.protectorRef)
        break
      case 'DAMAGE': {
        const total = event.amount + event.shieldAbsorbed
        if (sideOf(event.ref) !== sideOf(event.targetRef)) {
          lastHitBy.set(event.targetRef, event.ref)
          if (sideOf(event.ref) === side) of(event.ref).damage += total
        }
        if (holders.has(event.targetRef) && sideOf(event.targetRef) === side) {
          of(event.targetRef).mitigation += total
        }
        break
      }
      case 'HEAL':
        if (sideOf(event.ref) === side && sideOf(event.targetRef) === side) {
          of(event.ref).heal += event.amount
        }
        break
      case 'SHIELD':
        if (sideOf(event.ref) === side && sideOf(event.targetRef) === side) {
          of(event.ref).shield += event.amount
        }
        break
      case 'DEFEATED': {
        const killer = lastHitBy.get(event.ref)
        if (killer && sideOf(killer) === side && sideOf(event.ref) !== side) {
          of(killer).kills += XP_KILL_HP_SHARE * maxHpOf(event.ref)
        }
        break
      }
    }
  }

  return metrics
}

/** Nota de participação: soma das métricas com peso, cada uma com retorno decrescente. */
export function participationScore(metrics: BattleMetrics): number {
  return (Object.keys(XP_METRIC_WEIGHTS) as XpMetric[]).reduce(
    (sum, metric) =>
      sum +
      Math.pow(
        XP_METRIC_WEIGHTS[metric] * Math.max(0, metrics[metric]),
        XP_METRIC_EXPONENT
      ),
    0
  )
}

export interface BattleXpUnit {
  ref: string
  level: number
  metrics: BattleMetrics
}

export interface BattleXpInput {
  won: boolean
  difficulty: AiDifficulty
  /** Batalhas contra o mesmo squad de NPC entre as últimas 10 da conta (sem contar esta). */
  sameNpcRepeats: number
  /** Nível médio dos personagens da conta (catch-up). */
  accountAverageLevel: number
  /** Os 4 que entraram (vivos ou não). */
  units: BattleXpUnit[]
}

/**
 * XP de cada personagem no fim da batalha PvE (D76, D92): pool por resultado × dificuldade × mesmo NPC; 40% igual
 * entre os 4 e 60% pela participação; catch-up por personagem. Arredondado para baixo.
 */
export function battleXp(input: BattleXpInput): Map<string, number> {
  const sameNpc = Math.max(
    SAME_NPC_XP.floor,
    1 - SAME_NPC_XP.penalty * input.sameNpcRepeats
  )
  const pool =
    (input.won ? XP_POOL.WIN : XP_POOL.LOSS) *
    PVE_XP_MULTIPLIER[input.difficulty] *
    sameNpc

  const scores = input.units.map((u) => participationScore(u.metrics))
  const total = scores.reduce((sum, s) => sum + s, 0)
  const count = input.units.length

  return new Map(
    input.units.map((unit, i) => {
      // ninguém participou: a parte das métricas também vai igual
      const share =
        XP_EQUAL_SHARE / count +
        (1 - XP_EQUAL_SHARE) * (total > 0 ? scores[i] / total : 1 / count)
      const catchUp = Math.min(
        CATCH_UP_XP.max,
        CATCH_UP_XP.perLevel *
          Math.max(0, input.accountAverageLevel - unit.level)
      )

      return [unit.ref, Math.floor(pool * share * (1 + catchUp))]
    })
  )
}
