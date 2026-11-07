import { describe, expect, it } from 'vitest'
import { BattleEvent } from '../engine/battle-events'
import { BattleSide } from '../enums/battle-enums'
import { awakeningBattleStats, AwakeningStatsInput } from './awakening-stats'

const P0 = 'PLAYER:0'
const P1 = 'PLAYER:1'
const O0 = 'OPPONENT:0'
const O1 = 'OPPONENT:1'

const hit = (ref: string, targetRef: string, amount: number): BattleEvent => ({
  type: 'DAMAGE',
  ref,
  targetRef,
  amount,
  shieldAbsorbed: 0,
})

const stats = (
  events: BattleEvent[],
  override: Partial<AwakeningStatsInput> = {}
) =>
  awakeningBattleStats({
    events,
    side: BattleSide.PLAYER,
    refs: [P0, P1],
    aliveRefs: [P0, P1],
    won: true,
    enemyTotalHp: 1000,
    tierOf: (_, key) => (key === 'final' ? 'FINAL' : 'STANDARD'),
    ...override,
  })

describe('Awakening Battle Stats', () => {
  it('should be able to credit the kill to the last hit, as in the XP', () => {
    const result = stats([
      hit(P1, O0, 300),
      hit(P0, O0, 100),
      { type: 'DOT', ref: O0, amount: 50 },
      { type: 'DEFEATED', ref: O0 },
    ])

    expect(result.get(P0)!.kills).toBe(1)
    expect(result.get(P1)!.kills).toBe(0)
  })

  it('should be able to count each Strong or Final skill once when it damages an enemy', () => {
    const result = stats([
      { type: 'TURN', ref: P0, round: 1, tick: 1 },
      { type: 'SKILL', ref: P0, skillKey: 'final', potency: 1 },
      hit(P0, O0, 100),
      hit(P0, O1, 100),
      { type: 'TURN', ref: P0, round: 2, tick: 2 },
      { type: 'SKILL', ref: P0, skillKey: 'final', potency: 1 },
      { type: 'MISS', ref: P0, targetRef: O0 },
      { type: 'TURN', ref: P0, round: 3, tick: 3 },
      { type: 'SKILL', ref: P0, skillKey: 'basic', potency: 1 },
      hit(P0, O0, 100),
    ])

    expect(result.get(P0)!.heavyHits).toBe(1)
  })

  it('should be able to count only the status that landed on an enemy', () => {
    const result = stats([
      {
        type: 'STATUS',
        ref: P0,
        targetRef: O0,
        status: 'STUN',
        result: 'APPLIED',
      },
      {
        type: 'STATUS',
        ref: P0,
        targetRef: O1,
        status: 'STUN',
        result: 'RESISTED',
      },
      {
        type: 'STATUS',
        ref: P0,
        targetRef: O1,
        status: 'ROOT',
        result: 'IMMUNE',
      },
      {
        type: 'STATUS',
        ref: P0,
        targetRef: P1,
        status: 'STEALTH',
        result: 'APPLIED',
      },
      { type: 'LOCK', ref: P0, targetRef: O0, skillKey: 'x' },
    ])

    expect(result.get(P0)!.statusApplied).toBe(2)
  })

  it('should be able to measure the shares of the squad and of the enemy HP', () => {
    const result = stats([
      hit(P0, O0, 600),
      hit(P1, O0, 400),
      { type: 'HEAL', ref: P1, targetRef: P0, amount: 70 },
      { type: 'SHIELD', ref: P0, targetRef: P1, amount: 30 },
      { type: 'HEAL', ref: O0, targetRef: O0, amount: 500 },
    ])

    expect(result.get(P0)!.damageShare).toBe(0.6)
    expect(result.get(P0)!.enemyHpShare).toBe(0.6)
    expect(result.get(P1)!.supportShare).toBe(0.7)
    expect(result.get(P1)!.supportActions).toBe(1)
    expect(result.get(P0)!.supportActions).toBe(1)
  })

  it('should be able to mark the last one alive only in a win', () => {
    const won = stats([], { aliveRefs: [P1] })
    const lost = stats([], { aliveRefs: [P1], won: false })
    const twoAlive = stats([])

    expect(won.get(P1)!.lastAliveWin).toBe(true)
    expect(won.get(P0)!.lastAliveWin).toBe(false)
    expect(lost.get(P1)!.lastAliveWin).toBe(false)
    expect(twoAlive.get(P0)!.lastAliveWin).toBe(false)
  })
})
