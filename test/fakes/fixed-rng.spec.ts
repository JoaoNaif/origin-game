import { describe, expect, it } from 'vitest'
import { FixedRng } from './fixed-rng'

describe('Fixed Rng', () => {
  it('should be able to cycle through the given values', () => {
    const sut = new FixedRng([0.1, 0.9])

    expect([sut.next(), sut.next(), sut.next()]).toEqual([0.1, 0.9, 0.1])
  })

  it('should be able to drive the derived helpers', () => {
    const sut = new FixedRng([0.99])

    expect(sut.int(1, 10)).toBe(10)
    expect(sut.chance(0.5)).toBe(false)
  })
})
