import { beforeEach, describe, expect, it } from 'vitest'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { InsufficientFundsError } from '../errors/insufficient-funds-error'
import { Wallet } from './wallet'

let sut: Wallet

describe('Wallet', () => {
  beforeEach(() => {
    sut = Wallet.empty(new UniqueEntityId('conta-1'))
  })

  it('should be able to start empty, with the 7 fragment types at zero', () => {
    expect(sut.coins).toBe(0)
    expect(sut.version).toBe(0)
    expect(Object.values(sut.fragments)).toEqual([0, 0, 0, 0, 0, 0, 0])
  })

  it('should be able to earn coins and fragments and record the change', () => {
    const credited = sut.earn({
      reason: 'BATTLE_LOOT',
      refId: 'batalha-1',
      coins: 130,
      fragments: { ELEMENTAL: 2 },
    })

    expect(credited).toEqual({ coins: 130, fragments: { ELEMENTAL: 2 } })
    expect(sut.coins).toBe(130)
    expect(sut.fragmentsOf('ELEMENTAL')).toBe(2)
    expect(sut.entries).toEqual([
      {
        reason: 'BATTLE_LOOT',
        refId: 'batalha-1',
        coins: 130,
        fragments: { ELEMENTAL: 2 },
      },
    ])
  })

  it('should be able to turn fragments over the 500 cap into coins (40 each)', () => {
    sut.earn({ reason: 'BATTLE_LOOT', fragments: { NONE: 499 } })

    const credited = sut.earn({
      reason: 'CHEST_OPEN',
      coins: 10,
      fragments: { NONE: 3 },
    })

    expect(credited).toEqual({ coins: 10 + 2 * 40, fragments: { NONE: 1 } })
    expect(sut.fragmentsOf('NONE')).toBe(500)
    expect(sut.coins).toBe(90)
  })

  it('should be able to spend coins and fragments, all or nothing', () => {
    sut.earn({
      reason: 'BATTLE_LOOT',
      coins: 1000,
      fragments: { MATERIAL: 5 },
    })

    const spent = sut.spend({
      reason: 'SKILL_ENHANCEMENT',
      coins: 500,
      fragments: { MATERIAL: 5 },
    })

    expect(spent.isRight()).toBe(true)
    expect(sut.coins).toBe(500)
    expect(sut.fragmentsOf('MATERIAL')).toBe(0)
    expect(sut.entries.at(-1)).toMatchObject({
      coins: -500,
      fragments: { MATERIAL: -5 },
    })
  })

  it('should not be able to spend more than it has', () => {
    sut.earn({ reason: 'BATTLE_LOOT', coins: 1000, fragments: { MATERIAL: 4 } })

    const noFragments = sut.spend({
      reason: 'SKILL_ENHANCEMENT',
      coins: 500,
      fragments: { MATERIAL: 5 },
    })
    const noCoins = sut.spend({ reason: 'CHEST_PURCHASE', coins: 1001 })

    expect(noFragments.value).toBeInstanceOf(InsufficientFundsError)
    expect(noCoins.value).toBeInstanceOf(InsufficientFundsError)
    expect(sut.coins).toBe(1000)
    expect(sut.fragmentsOf('MATERIAL')).toBe(4)
    expect(sut.entries).toHaveLength(1)
  })
})
