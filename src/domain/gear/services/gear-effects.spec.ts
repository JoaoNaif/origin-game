import { beforeEach, describe, expect, it } from 'vitest'
import { Stat } from '@/domain/characters/enums/stat'
import { GearTemplate } from '../entities/gear-template'
import { gearEffects } from './gear-effects'

let king: GearTemplate
let squire: GearTemplate

function make(grade: 'KING' | 'SQUIRE'): GearTemplate {
  const created = GearTemplate.create({
    key: `teste-${grade.toLowerCase()}`,
    name: 'Teste',
    kind: 'WEAPON',
    grade,
    lineage: 'ELEMENTAL',
    primaryStat: Stat.ATTACK,
    secondaryStat: Stat.PRECISION,
    requirements:
      grade === 'KING'
        ? [
            { stat: Stat.ATTACK, level: 'HIGH' },
            { stat: Stat.PRECISION, level: 'HIGH' },
            { stat: Stat.DEFENSE, level: 'LOW' },
            { stat: Stat.HP, level: 'LOW' },
          ]
        : [
            { stat: Stat.ATTACK, level: 'HIGH' },
            { stat: Stat.DEFENSE, level: 'LOW' },
          ],
    titles: ['Rei', 'Vidente'],
  })
  if (created.isLeft()) throw created.value
  return created.value
}

describe('Gear Effects', () => {
  beforeEach(() => {
    king = make('KING')
    squire = make('SQUIRE')
  })

  it('should be able to give the full bonus, the passive and the full bond cost', () => {
    const sut = gearEffects(king, 'FULL', true)

    expect(sut.bonusPercents).toEqual({ ATTACK: 12, PRECISION: 8 })
    expect(sut.penaltyPercents).toEqual({})
    expect(sut.initialDesgastePercent).toBe(5)
    expect(sut.passive).toEqual({ type: 'DOT_ON_HIT', chance: 0.15 })
    expect(sut.loseAction).toBeNull()
  })

  it('should be able to scale bonus and passive by the bond, with penalties and no cost', () => {
    const partial = gearEffects(king, 'PARTIAL', true)
    const none = gearEffects(king, 'NONE', true)

    expect(partial.bonusPercents).toEqual({ ATTACK: 7.2, PRECISION: 4.8 })
    expect(partial.initialDesgastePercent).toBe(0)
    expect(partial.penaltyPercents.WILL).toBe(-1.5)
    expect(partial.loseAction).toEqual({ start: 2, step: 2, max: 15 })
    expect(none.bonusPercents).toEqual({ ATTACK: 3.6, PRECISION: 2.4 })
    expect(none.passive).toEqual({ type: 'DOT_ON_HIT', chance: 0.05 })
    expect(none.loseAction).toEqual({ start: 6, step: 5, max: 45 })
  })

  it('should be able to make a King without bond worse than a Knight-level bonus', () => {
    // sem elo nunca compensa (9.3): o Rei sem elo dá menos que o Cavaleiro pleno (+5% / +3%)
    const none = gearEffects(king, 'NONE', true)

    expect(none.bonusPercents.ATTACK!).toBeLessThan(5)
    expect(none.penaltyPercents.ATTACK).toBe(-9)
  })

  it('should be able to scale the passive by the grade and give ×1,25 without variant', () => {
    const sut = gearEffects(squire, 'FULL', false)

    expect(sut.passive).toEqual({ type: 'DOT_ON_HIT', chance: 0.06 })
    expect(sut.bonusPercents).toEqual({ ATTACK: 3.75, PRECISION: 2.5 })
    expect(sut.initialDesgastePercent).toBe(1.5)
  })
})
