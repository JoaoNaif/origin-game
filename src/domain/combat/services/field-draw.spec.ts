import { Stat } from '@/domain/characters/enums/stat'
import { FixedRng } from 'test/fakes/fixed-rng'
import { describe, expect, it } from 'vitest'
import { SnapshotField } from '../value-objects/battle-snapshot'
import { drawInitialField, qualifiedCount, qualifies } from './field-draw'

const field = (key: string, traits: string[]): SnapshotField => ({
  key,
  name: key,
  requiredTraitKeys: traits,
  primaryStat: Stat.ATTACK,
  secondaryStat: Stat.SPEED,
  primaryPercent: 6,
  secondaryPercent: 4,
})

const FOREST = field('forest', ['stealthy', 'veteran'])
const ARENA = field('arena', ['warrior', 'berserker'])

describe('Field Draw', () => {
  it('should be able to qualify whoever has any of the required traits', () => {
    expect(qualifies(FOREST, ['veteran', 'tamer'])).toBe(true)
    expect(qualifies(FOREST, ['tamer'])).toBe(false)
  })

  it('should be able to count the qualified characters of a side', () => {
    expect(qualifiedCount(FOREST, [['stealthy'], ['veteran'], [], ['x']])).toBe(
      2
    )
  })

  it('should be able to draw among all fields with the seed (D112)', () => {
    expect(drawInitialField([FOREST, ARENA], new FixedRng([0]))).toBe(FOREST)
    expect(drawInitialField([FOREST, ARENA], new FixedRng([0.99]))).toBe(ARENA)
  })

  it('should be able to start without field when the catalog is empty', () => {
    expect(drawInitialField([], new FixedRng([0]))).toBeNull()
  })
})
