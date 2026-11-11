import { describe, expect, it } from 'vitest'
import { Stat } from '@/domain/characters/enums/stat'
import { InvalidGearError } from '../errors/invalid-gear-error'
import { CreateGearTemplateInput, GearTemplate } from './gear-template'

function input(
  override: Partial<CreateGearTemplateInput> = {}
): CreateGearTemplateInput {
  return {
    key: 'espada-de-teste',
    name: 'Espada de Teste',
    kind: 'WEAPON',
    grade: 'MASTER',
    lineage: 'ELEMENTAL',
    primaryStat: Stat.ATTACK,
    secondaryStat: Stat.SPEED,
    requirements: [
      { stat: Stat.ATTACK, level: 'HIGH' },
      { stat: Stat.SPEED, level: 'HIGH' },
      { stat: Stat.DEFENSE, level: 'LOW' },
    ],
    titles: ['Rei', 'Vidente'],
    ...override,
  }
}

describe('Gear Template', () => {
  it('should be able to create with the grade bonus by default', () => {
    const sut = GearTemplate.create(input())

    expect(sut.isRight()).toBe(true)
    if (sut.isLeft()) return
    expect(sut.value.primaryPercent).toBe(8)
    expect(sut.value.secondaryPercent).toBe(5)
  })

  it('should be able to tune the bonus up to 15% within the grade', () => {
    expect(GearTemplate.create(input({ primaryPercent: 9.2 })).isRight()).toBe(
      true
    )
    expect(
      GearTemplate.create(input({ primaryPercent: 9.3 })).value
    ).toBeInstanceOf(InvalidGearError)
  })

  it('should not be able to create with the wrong number of requirements for the grade', () => {
    const result = GearTemplate.create(
      input({ grade: 'KING', titles: ['Rei', 'Vidente'] })
    )

    expect(result.value).toBeInstanceOf(InvalidGearError)
  })

  it('should not be able to create a Master or above without a "low" requirement', () => {
    const result = GearTemplate.create(
      input({
        requirements: [
          { stat: Stat.ATTACK, level: 'HIGH' },
          { stat: Stat.SPEED, level: 'HIGH' },
          { stat: Stat.HP, level: 'HIGH' },
        ],
      })
    )

    expect(result.value).toBeInstanceOf(InvalidGearError)
  })

  it('should not be able to use the same stat twice or a none lineage', () => {
    expect(
      GearTemplate.create(
        input({
          requirements: [
            { stat: Stat.ATTACK, level: 'HIGH' },
            { stat: Stat.ATTACK, level: 'LOW' },
            { stat: Stat.DEFENSE, level: 'LOW' },
          ],
        })
      ).value
    ).toBeInstanceOf(InvalidGearError)
    expect(
      GearTemplate.create(input({ lineage: 'NONE' as never })).value
    ).toBeInstanceOf(InvalidGearError)
  })

  it('should not be able to list unknown titles or fewer than 2', () => {
    expect(
      GearTemplate.create(input({ titles: ['Rei', 'Lenda'] })).value
    ).toBeInstanceOf(InvalidGearError)
    expect(
      GearTemplate.create(input({ titles: ['Rei'] })).value
    ).toBeInstanceOf(InvalidGearError)
  })
})
