import { describe, expect, it } from 'vitest'
import { makeBattleSnapshot } from 'test/factories/make-battle-snapshot'
import { applyEventModifiers } from './event-snapshot'

describe('Event Snapshot', () => {
  it('should be able to keep the snapshot without modifiers', () => {
    const snapshot = makeBattleSnapshot()

    expect(applyEventModifiers(snapshot, [])).toBe(snapshot)
  })

  it('should be able to level every unit of both sides', () => {
    const result = applyEventModifiers(makeBattleSnapshot(), [
      { type: 'LEVELED_STATS', level: 30 },
    ])

    expect(
      [...result.player.units, ...result.opponent.units].every(
        (u) => u.level === 30
      )
    ).toBe(true)
    expect(result.rules).toBeUndefined()
  })

  it('should be able to turn the other modifiers into battle rules', () => {
    const result = applyEventModifiers(makeBattleSnapshot(), [
      { type: 'EARLY_EXHAUSTION', afterRound: 1 },
      { type: 'NO_HEALING' },
      { type: 'EQUAL_SPEED' },
    ])

    expect(result.rules).toEqual({
      exhaustionAfterRound: 1,
      noHealing: true,
      equalSpeed: true,
    })
  })
})
