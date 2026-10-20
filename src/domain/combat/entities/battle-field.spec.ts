import { Stat } from '@/domain/characters/enums/stat'
import { TraitCategory } from '@/domain/characters/enums/trait-category'
import { makeTrait } from 'test/factories/make-trait'
import { describe, expect, it } from 'vitest'
import { InvalidBattleFieldError } from '../errors/invalid-battle-field-error'
import { BattleField, CreateBattleFieldInput } from './battle-field'

const input = (
  override: Partial<CreateBattleFieldInput> = {}
): CreateBattleFieldInput => ({
  key: 'arena',
  name: 'Arena',
  primaryStat: Stat.ATTACK,
  secondaryStat: Stat.SPEED,
  requiredTraits: [
    makeTrait({ key: 'warrior', category: TraitCategory.COMBAT }),
    makeTrait({ key: 'stealthy', category: TraitCategory.POSTURE }),
  ],
  ...override,
})

describe('Create Battle Field', () => {
  it('should be able to create a field with the reference bonus (D98)', () => {
    const sut = BattleField.create(input())

    expect(sut.isRight()).toBe(true)
    if (sut.isRight()) {
      expect(sut.value.primaryPercent).toBe(6)
      expect(sut.value.secondaryPercent).toBe(4)
      expect(sut.value.requiredTraitIds).toHaveLength(2)
    }
  })

  it('should not be able to ask for a single trait', () => {
    const sut = BattleField.create(
      input({ requiredTraits: [makeTrait({ key: 'warrior' })] })
    )

    expect(sut.isLeft()).toBe(true)
    expect(sut.value).toBeInstanceOf(InvalidBattleFieldError)
  })

  it('should not be able to ask only for traits of one category', () => {
    const sut = BattleField.create(
      input({
        requiredTraits: [
          makeTrait({ key: 'a', category: TraitCategory.COMBAT }),
          makeTrait({ key: 'b', category: TraitCategory.COMBAT }),
        ],
      })
    )

    expect(sut.isLeft()).toBe(true)
  })

  it('should not be able to boost the same stat twice', () => {
    const sut = BattleField.create(
      input({ primaryStat: Stat.ATTACK, secondaryStat: Stat.ATTACK })
    )

    expect(sut.isLeft()).toBe(true)
  })
})
