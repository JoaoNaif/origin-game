import { beforeEach, describe, expect, it } from 'vitest'
import { makeVariant } from 'test/factories/make-variant'
import { InvalidAwakeningError } from '../errors/invalid-awakening-error'
import { Awakening, CreateAwakeningInput } from './awakening'
import { Variant } from './variant'

let fire: Variant
let blueFire: Variant

const input = (
  override: Partial<CreateAwakeningInput> = {}
): CreateAwakeningInput => ({
  key: 'blue-fire',
  name: 'Fogo azul',
  variant: blueFire,
  requirements: [
    { stat: 'ATTACK', level: 'HIGH' },
    { stat: 'PRECISION', level: 'HIGH' },
  ],
  missions: [
    { kind: 'KILLS', threshold: 100 },
    { kind: 'DAMAGE_SHARE', threshold: 15 },
    { kind: 'TRIPLE_KILL', threshold: 1 },
  ],
  ...override,
})

describe('Awakening', () => {
  beforeEach(() => {
    fire = makeVariant()
    blueFire = makeVariant({
      key: 'blue-fire',
      name: 'Fogo azul',
      awakensFrom: fire,
    })
  })

  it('should be able to create an awakening of an awakened variant', () => {
    const result = Awakening.create(input())

    expect(result.isRight()).toBe(true)
    const awakening = result.value as Awakening
    expect(awakening.variantId.equals(blueFire.id)).toBe(true)
    // quem pode sortear: os da variante base
    expect(awakening.baseVariantId.equals(fire.id)).toBe(true)
  })

  it('should not be able to create an awakening of a base variant', () => {
    const result = Awakening.create(input({ variant: fire }))

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidAwakeningError)
  })

  it('should not be able to create a profile outside 2 to 3 requirements', () => {
    const one = Awakening.create(
      input({ requirements: [{ stat: 'ATTACK', level: 'HIGH' }] })
    )
    const four = Awakening.create(
      input({
        requirements: [
          { stat: 'ATTACK', level: 'HIGH' },
          { stat: 'SPEED', level: 'HIGH' },
          { stat: 'DEFENSE', level: 'LOW' },
          { stat: 'WILL', level: 'LOW' },
        ],
      })
    )

    expect(one.isLeft()).toBe(true)
    expect(four.isLeft()).toBe(true)
  })

  it('should not be able to repeat a stat or ask more than 2 high stats', () => {
    const repeated = Awakening.create(
      input({
        requirements: [
          { stat: 'ATTACK', level: 'HIGH' },
          { stat: 'ATTACK', level: 'LOW' },
        ],
      })
    )
    const threeHigh = Awakening.create(
      input({
        requirements: [
          { stat: 'ATTACK', level: 'HIGH' },
          { stat: 'SPEED', level: 'HIGH' },
          { stat: 'WILL', level: 'HIGH' },
        ],
      })
    )

    expect(repeated.isLeft()).toBe(true)
    expect(threeHigh.isLeft()).toBe(true)
  })

  it('should not be able to create a mission pool missing a category', () => {
    const result = Awakening.create(
      input({
        missions: [
          { kind: 'KILLS', threshold: 100 },
          { kind: 'DAMAGE_SHARE', threshold: 15 },
        ],
      })
    )

    expect(result.isLeft()).toBe(true)
    expect((result.value as Error).message).toContain('cada categoria')
  })

  it('should not be able to repeat a mission kind or use a threshold below 1', () => {
    const repeated = Awakening.create(
      input({
        missions: [
          { kind: 'KILLS', threshold: 100 },
          { kind: 'KILLS', threshold: 50 },
          { kind: 'DAMAGE_SHARE', threshold: 15 },
          { kind: 'TRIPLE_KILL', threshold: 1 },
        ],
      })
    )
    const zero = Awakening.create(
      input({
        missions: [
          { kind: 'KILLS', threshold: 0 },
          { kind: 'DAMAGE_SHARE', threshold: 15 },
          { kind: 'TRIPLE_KILL', threshold: 1 },
        ],
      })
    )

    expect(repeated.isLeft()).toBe(true)
    expect(zero.isLeft()).toBe(true)
  })
})
