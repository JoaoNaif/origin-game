import { describe, expect, it } from 'vitest'
import { BattleEvent } from '../engine/battle-events'
import { BattleSide } from '../enums/battle-enums'
import {
  BattleMetrics,
  battleMetrics,
  battleXp,
  BattleXpUnit,
  participationScore,
} from './battle-xp'

const none = (): BattleMetrics => ({
  damage: 0,
  heal: 0,
  shield: 0,
  mitigation: 0,
  kills: 0,
})

const units = (metrics: Partial<BattleMetrics>[] = []): BattleXpUnit[] =>
  [0, 1, 2, 3].map((i) => ({
    ref: `PLAYER:${i}`,
    level: 18,
    metrics: { ...none(), ...metrics[i] },
  }))

describe('Battle XP', () => {
  it('should be able to split a Beginner win equally when nobody took part', () => {
    const xp = battleXp({
      won: true,
      difficulty: 'BEGINNER',
      sameNpcRepeats: 0,
      accountAverageLevel: 18,
      units: units(),
    })

    // 400 × 0,6 = 240, ÷ 4
    expect([...xp.values()]).toEqual([60, 60, 60, 60])
  })

  it('should be able to give 60% of the pool by participation', () => {
    const xp = battleXp({
      won: true,
      difficulty: 'ADVANCED',
      sameNpcRepeats: 0,
      accountAverageLevel: 18,
      units: units([{ damage: 1000 }]),
    })

    // 400: 40% igual (40 cada) + 60% (240) todo para quem participou
    expect(xp.get('PLAYER:0')).toBe(280)
    expect(xp.get('PLAYER:1')).toBe(40)
  })

  it('should be able to give less for a loss and for the same NPC again', () => {
    const xp = battleXp({
      won: false,
      difficulty: 'ADVANCED',
      sameNpcRepeats: 8,
      accountAverageLevel: 18,
      units: units(),
    })

    // 160 × piso 0,4 = 64, ÷ 4
    expect(xp.get('PLAYER:0')).toBe(16)
  })

  it('should be able to give catch-up to characters below the account average', () => {
    const list = units()
    list[0] = { ...list[0], level: 0 }

    const xp = battleXp({
      won: true,
      difficulty: 'ADVANCED',
      sameNpcRepeats: 0,
      accountAverageLevel: 18,
      units: list,
    })

    // 18 níveis abaixo: +36%
    expect(xp.get('PLAYER:0')).toBe(136)
    expect(xp.get('PLAYER:1')).toBe(100)
  })

  it('should be able to score with diminishing returns per metric', () => {
    const one = participationScore({ ...none(), damage: 1000 })
    const split = participationScore({ ...none(), damage: 500, heal: 500 })

    expect(split).toBeGreaterThan(one)
  })

  it('should be able to read the metrics from the battle events', () => {
    const events: BattleEvent[] = [
      { type: 'TURN', ref: 'PLAYER:0', round: 1, tick: 1 },
      { type: 'SKILL', ref: 'PLAYER:0', skillKey: 'a', potency: 1 },
      {
        type: 'DAMAGE',
        ref: 'PLAYER:0',
        targetRef: 'OPPONENT:0',
        amount: 90,
        shieldAbsorbed: 10,
      },
      { type: 'DEFEATED', ref: 'OPPONENT:0' },
      { type: 'TURN', ref: 'OPPONENT:1', round: 1, tick: 2 },
      { type: 'SKILL', ref: 'OPPONENT:1', skillKey: 'b', potency: 1 },
      { type: 'INTERCEPT', guardianRef: 'PLAYER:1', protectedRef: 'PLAYER:2' },
      {
        type: 'DAMAGE',
        ref: 'OPPONENT:1',
        targetRef: 'PLAYER:1',
        amount: 50,
        shieldAbsorbed: 0,
      },
      { type: 'TURN', ref: 'PLAYER:3', round: 1, tick: 3 },
      { type: 'HEAL', ref: 'PLAYER:3', targetRef: 'PLAYER:1', amount: 40 },
    ]

    const metrics = battleMetrics(events, BattleSide.PLAYER, () => 1000)

    expect(metrics.get('PLAYER:0')).toMatchObject({ damage: 100, kills: 100 })
    expect(metrics.get('PLAYER:1')).toMatchObject({ mitigation: 50 })
    expect(metrics.get('PLAYER:3')).toMatchObject({ heal: 40 })
    expect(metrics.has('OPPONENT:1')).toBe(false)
  })
})
