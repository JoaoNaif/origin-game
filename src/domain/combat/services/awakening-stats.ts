import { AwakeningBattleStats } from '@/domain/characters/value-objects/awakening-progress'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { BattleEvent } from '../engine/battle-events'
import { BattleSide } from '../enums/battle-enums'

/** Skills que contam em "acertar com skill Forte ou Final" (`HEAVY_HITS`, D151). */
const HEAVY_TIERS: readonly SkillTier[] = [SkillTier.STRONG, SkillTier.FINAL]

const sideOf = (ref: string) =>
  ref.startsWith(BattleSide.PLAYER) ? BattleSide.PLAYER : BattleSide.OPPONENT

export interface AwakeningStatsInput {
  events: readonly BattleEvent[]
  side: BattleSide
  /** As unidades do lado (todas, vivas ou não). */
  refs: readonly string[]
  /** Quem do lado terminou vivo. */
  aliveRefs: readonly string[]
  won: boolean
  /** Soma do HP máximo do lado inimigo. */
  enemyTotalHp: number
  /** Tipo da skill usada (pela `key` do evento `SKILL`); `null` se não achar. */
  tierOf: (ref: string, skillKey: string) => SkillTier | null
}

interface Counters {
  kills: number
  statusApplied: number
  heavyHits: number
  supportActions: number
  damage: number
  support: number
}

/**
 * O que a batalha mediu de cada unidade de um lado para as missões do despertar (D151, `awakening_brief.md` 7.2):
 * abates (o último golpe é dele, como no XP), status que pegaram num inimigo, usos de Forte ou Final que causaram dano
 * num inimigo, curas e escudos em aliados, as frações do dano e do suporte da squad, a vitória como último vivo e a
 * fração do HP total inimigo.
 */
export function awakeningBattleStats(
  input: AwakeningStatsInput
): Map<string, AwakeningBattleStats> {
  const { side } = input
  const counters = new Map<string, Counters>(
    input.refs.map((ref) => [
      ref,
      {
        kills: 0,
        statusApplied: 0,
        heavyHits: 0,
        supportActions: 0,
        damage: 0,
        support: 0,
      },
    ])
  )
  const ours = (ref: string | undefined) =>
    ref !== undefined && sideOf(ref) === side ? counters.get(ref) : undefined

  const lastHitBy = new Map<string, string>()
  /** A skill Forte ou Final em resolução e se ela já contou. */
  let heavy: { ref: string; counted: boolean } | null = null

  for (const event of input.events) {
    switch (event.type) {
      case 'TURN':
        heavy = null
        break
      case 'SKILL': {
        const tier = input.tierOf(event.ref, event.skillKey)
        heavy =
          tier && HEAVY_TIERS.includes(tier)
            ? { ref: event.ref, counted: false }
            : null
        break
      }
      case 'DAMAGE': {
        if (sideOf(event.ref) === sideOf(event.targetRef)) break
        lastHitBy.set(event.targetRef, event.ref)

        const own = ours(event.ref)
        if (!own) break
        own.damage += event.amount + event.shieldAbsorbed
        if (heavy && heavy.ref === event.ref && !heavy.counted) {
          heavy.counted = true
          own.heavyHits += 1
        }
        break
      }
      case 'HEAL':
      case 'SHIELD': {
        // a regeneração do equipamento vivo é do item, não jogada (D153)
        if (event.type === 'HEAL' && event.source === 'GEAR') break
        const own = ours(event.ref)
        if (own && sideOf(event.targetRef) === side && event.amount > 0) {
          own.supportActions += 1
          own.support += event.amount
        }
        break
      }
      case 'STATUS': {
        const own = ours(event.ref)
        if (
          own &&
          sideOf(event.targetRef) !== side &&
          event.result !== 'RESISTED' &&
          event.result !== 'IMMUNE'
        ) {
          own.statusApplied += 1
        }
        break
      }
      case 'LOCK': {
        const own = ours(event.ref)
        if (own && sideOf(event.targetRef) !== side) own.statusApplied += 1
        break
      }
      case 'DEFEATED': {
        const killer = lastHitBy.get(event.ref)
        const own = ours(killer)
        if (own && sideOf(event.ref) !== side) own.kills += 1
        break
      }
    }
  }

  const all = [...counters.values()]
  const squadDamage = all.reduce((sum, c) => sum + c.damage, 0)
  const squadSupport = all.reduce((sum, c) => sum + c.support, 0)
  const soleSurvivor =
    input.won && input.aliveRefs.length === 1 ? input.aliveRefs[0] : null

  return new Map(
    [...counters].map(([ref, c]) => [
      ref,
      {
        kills: c.kills,
        statusApplied: c.statusApplied,
        heavyHits: c.heavyHits,
        supportActions: c.supportActions,
        damageShare: squadDamage > 0 ? c.damage / squadDamage : 0,
        supportShare: squadSupport > 0 ? c.support / squadSupport : 0,
        lastAliveWin: soleSurvivor === ref,
        enemyHpShare:
          input.enemyTotalHp > 0 ? c.damage / input.enemyTotalHp : 0,
      },
    ])
  )
}
