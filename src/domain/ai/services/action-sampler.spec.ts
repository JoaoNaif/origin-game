import { FixedRng } from 'test/fakes/fixed-rng'
import { describe, expect, it } from 'vitest'
import { normalizeScores, sampleAction } from './action-sampler'

describe('Action Sampler', () => {
  it('should be able to normalize scores with min-max', () => {
    expect(normalizeScores([-1, 0, 3])).toEqual([0, 0.25, 1])
    expect(normalizeScores([2, 2])).toEqual([1, 1])
  })

  it('should be able to always pick the best action at temperature 0', () => {
    const sut = sampleAction([0.3, 1, 0.9], 0, new FixedRng([0.99]))

    expect(sut).toBe(1)
  })

  it('should be able to break a tie at temperature 0 with the rng', () => {
    expect(sampleAction([1, 0.5, 1], 0, new FixedRng([0]))).toBe(0)
    expect(sampleAction([1, 0.5, 1], 0, new FixedRng([0.99]))).toBe(2)
  })

  it('should never be able to pick an action below the 0.2 cut', () => {
    for (const draw of [0, 0.25, 0.5, 0.75, 0.999]) {
      const sut = sampleAction([0, 0.1, 1, 0.5], 1, new FixedRng([draw]))
      expect([2, 3]).toContain(sut)
    }
  })

  it('should be able to pick weaker actions more often at higher temperatures', () => {
    const scores = [1, 0.6]
    const share = (temperature: number) => {
      let weak = 0
      for (let i = 0; i < 100; i++) {
        if (sampleAction(scores, temperature, new FixedRng([i / 100])) === 1)
          weak += 1
      }
      return weak
    }

    expect(share(1)).toBeGreaterThan(share(0.1))
    expect(share(0.1)).toBeLessThan(5)
  })
})
