import { describe, expect, it } from 'vitest'
import { SeededRng } from './seeded-rng'

const sequence = (rng: SeededRng, size: number) =>
  Array.from({ length: size }, () => rng.next())

describe('Seeded Rng', () => {
  it('should be able to repeat the same sequence for the same seed', () => {
    const sut = new SeededRng(42)

    expect(sequence(sut, 20)).toEqual(sequence(new SeededRng(42), 20))
  })

  it('should be able to produce different sequences for different seeds', () => {
    const sut = new SeededRng(1)

    expect(sequence(sut, 20)).not.toEqual(sequence(new SeededRng(2), 20))
  })

  it('should be able to produce values in [0, 1)', () => {
    const sut = new SeededRng(7)

    for (const value of sequence(sut, 1000)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  it('should be able to produce integers within inclusive bounds', () => {
    const sut = new SeededRng(7)

    const values = Array.from({ length: 1000 }, () => sut.int(3, 6))

    expect(Math.min(...values)).toBe(3)
    expect(Math.max(...values)).toBe(6)
  })

  it('should not be able to pick from an empty list', () => {
    const sut = new SeededRng(7)

    expect(() => sut.pick([])).toThrow()
  })
})
