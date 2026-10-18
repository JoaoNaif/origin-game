import { Stat } from '@/domain/characters/enums/stat'
import { StatusType } from '@/domain/skills/enums/status-type'
import { beforeEach, describe, expect, it } from 'vitest'
import { StatModifier, UnitConditions } from './conditions'

const modifier = (override: Partial<StatModifier> = {}): StatModifier => ({
  source: 'war-cry',
  stat: Stat.ATTACK,
  percent: 20,
  turnsLeft: 3,
  ...override,
})

describe('Unit Conditions', () => {
  let sut: UnitConditions

  beforeEach(() => {
    sut = new UnitConditions()
  })

  describe('Statuses', () => {
    it('should be able to lose the next action when stunned', () => {
      sut.applyDefaultStatus(StatusType.STUN)

      expect(sut.startTurn(700).skipAction).toBe(true)
      expect(sut.has(StatusType.STUN)).toBe(false)
      expect(sut.startTurn(700).skipAction).toBe(false)
    })

    it('should not be able to be stunned again right after a stun (anti-chain)', () => {
      sut.applyDefaultStatus(StatusType.STUN)
      sut.startTurn(700) // perde a ação, fica imune

      expect(sut.applyDefaultStatus(StatusType.STUN)).toBe('IMMUNE')

      sut.startTurn(700) // a imunidade acaba
      expect(sut.applyDefaultStatus(StatusType.STUN)).toBe('APPLIED')
    })

    it('should be able to take 4% of max HP per turn from damage over time', () => {
      sut.applyDefaultStatus(StatusType.DOT)

      const turns = [sut.startTurn(700), sut.startTurn(700), sut.startTurn(700)]

      expect(turns.map((t) => t.dotDamage)).toEqual([28, 28, 28])
      expect(sut.startTurn(700).dotDamage).toBe(0)
    })

    it('should be able to take 20% more damage while marked', () => {
      sut.applyDefaultStatus(StatusType.MARK)

      expect(sut.damageTakenMultiplier).toBeCloseTo(1.2)
    })

    it('should be able to renew a status instead of stacking it', () => {
      sut.applyDefaultStatus(StatusType.MARK)
      sut.startTurn(700) // sobram 2

      expect(sut.applyDefaultStatus(StatusType.MARK)).toBe('RENEWED')
      expect(sut.turnsLeft(StatusType.MARK)).toBe(3)
      expect(sut.damageTakenMultiplier).toBeCloseTo(1.2)
    })

    it('should be able to block movement while rooted and expose to melee', () => {
      sut.applyDefaultStatus(StatusType.ROOT)
      sut.applyDefaultStatus(StatusType.EXPOSE)

      expect(sut.canBeMoved).toBe(false)
      expect(sut.isExposed).toBe(true)

      sut.startTurn(700)
      sut.startTurn(700)

      expect(sut.canBeMoved).toBe(true)
      expect(sut.isExposed).toBe(false)
    })
  })

  describe('Stat modifiers', () => {
    it('should be able to multiply sources (D73)', () => {
      sut.addModifier(modifier())
      sut.addModifier(modifier({ source: 'curse', percent: -20 }))

      // +20% e −20% dão ×0,96
      expect(sut.statMultiplier(Stat.ATTACK)).toBeCloseTo(0.96)
      expect(sut.effectiveStat(Stat.ATTACK, 100)).toBeCloseTo(96)
    })

    it('should be able to renew the same source instead of stacking', () => {
      sut.addModifier(modifier())

      expect(sut.addModifier(modifier({ turnsLeft: 5 }))).toBe('RENEWED')
      expect(sut.modifiersOf(Stat.ATTACK)).toHaveLength(1)
      expect(sut.modifiersOf(Stat.ATTACK)[0].turnsLeft).toBe(5)
    })

    it('should be able to keep 2 buffs per stat, reaching +44% at most', () => {
      sut.addModifier(modifier({ source: 'a' }))
      sut.addModifier(modifier({ source: 'b' }))

      expect(sut.addModifier(modifier({ source: 'c', percent: 15 }))).toBe(
        'IGNORED'
      )
      expect(sut.statMultiplier(Stat.ATTACK)).toBeCloseTo(1.44)
    })

    it('should be able to replace the weakest source with a stronger one', () => {
      sut.addModifier(modifier({ source: 'weak', percent: 10 }))
      sut.addModifier(modifier({ source: 'mid', percent: 15 }))

      expect(sut.addModifier(modifier({ source: 'strong', percent: 20 }))).toBe(
        'REPLACED'
      )
      expect(sut.modifiersOf(Stat.ATTACK).map((m) => m.source)).toEqual([
        'mid',
        'strong',
      ])
    })

    it('should be able to count buffs and debuffs separately', () => {
      sut.addModifier(modifier({ source: 'a' }))
      sut.addModifier(modifier({ source: 'b' }))
      sut.addModifier(modifier({ source: 'c', percent: -20 }))
      sut.addModifier(modifier({ source: 'd', percent: -20 }))

      expect(sut.modifiersOf(Stat.ATTACK)).toHaveLength(4)
    })

    it('should be able to stay out of the source limit (Defender, field)', () => {
      sut.addModifier(modifier({ source: 'a', stat: Stat.DEFENSE }))
      sut.addModifier(modifier({ source: 'b', stat: Stat.DEFENSE }))

      sut.addModifier(
        modifier({
          source: 'defend',
          stat: Stat.DEFENSE,
          percent: 50,
          unlimited: true,
        })
      )

      expect(sut.statMultiplier(Stat.DEFENSE)).toBeCloseTo(1.2 * 1.2 * 1.5)
    })

    it('should be able to expire modifiers by the turns of the affected', () => {
      sut.addModifier(modifier({ turnsLeft: 1 }))

      sut.startTurn(700)

      expect(sut.statMultiplier(Stat.ATTACK)).toBe(1)
    })
  })
})
