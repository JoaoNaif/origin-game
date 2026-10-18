import { beforeEach, describe, expect, it } from 'vitest'
import { InvalidTargetError } from '../errors/invalid-target-error'
import { adjacentCells, BattleGrid, isAdjacent } from './battle-grid'

//            coluna 0   coluna 1   coluna 2
//  linha 0      A          B          .
//  linha 1      .          C          .
//  linha 2      D          .          .
describe('Battle Grid', () => {
  let sut: BattleGrid

  beforeEach(() => {
    sut = new BattleGrid([
      { ref: 'A', row: 0, column: 0 },
      { ref: 'B', row: 0, column: 1 },
      { ref: 'C', row: 1, column: 1 },
      { ref: 'D', row: 2, column: 0 },
    ])
  })

  it('should be able to tell adjacency in 4 directions, without diagonal', () => {
    expect(isAdjacent({ row: 0, column: 0 }, { row: 0, column: 1 })).toBe(true)
    expect(isAdjacent({ row: 0, column: 0 }, { row: 1, column: 1 })).toBe(false)
    expect(adjacentCells({ row: 0, column: 0 })).toHaveLength(2)
    expect(adjacentCells({ row: 1, column: 1 })).toHaveLength(4)
  })

  describe('Move', () => {
    it('should be able to move to an adjacent empty cell', () => {
      expect(sut.move('A', { row: 1, column: 0 }, true).isRight()).toBe(true)
      expect(sut.positionOf('A')).toEqual({ row: 1, column: 0 })
    })

    it('should not be able to move to an occupied cell', () => {
      const result = sut.move('A', { row: 0, column: 1 }, true)

      expect(result.isLeft()).toBe(true)
      expect(result.value).toBeInstanceOf(InvalidTargetError)
    })

    it('should not be able to move two cells away', () => {
      expect(sut.move('D', { row: 2, column: 2 }, true).isLeft()).toBe(true)
    })

    it('should not be able to move while rooted', () => {
      expect(sut.move('A', { row: 1, column: 0 }, false).isLeft()).toBe(true)
    })
  })

  describe('Swap', () => {
    it('should be able to swap two allies', () => {
      sut.swap('A', 'D', { a: true, b: true })

      expect(sut.positionOf('A')).toEqual({ row: 2, column: 0 })
      expect(sut.positionOf('D')).toEqual({ row: 0, column: 0 })
    })

    it('should not be able to swap with a rooted ally', () => {
      expect(sut.swap('A', 'D', { a: true, b: false }).isLeft()).toBe(true)
    })
  })

  describe('Forced move', () => {
    it('should be able to push to the back of the line', () => {
      expect(sut.forcedMove('B', 'PUSH', true)).toBe('MOVED')
      expect(sut.positionOf('B')).toEqual({ row: 0, column: 2 })
    })

    it('should be able to pull to the front of the line', () => {
      expect(sut.forcedMove('C', 'PULL', true)).toBe('MOVED')
      expect(sut.positionOf('C')).toEqual({ row: 1, column: 0 })
    })

    it('should be blocked by an occupied cell, without failing the skill (D44)', () => {
      expect(sut.forcedMove('A', 'PUSH', true)).toBe('BLOCKED')
      expect(sut.positionOf('A')).toEqual({ row: 0, column: 0 })
    })

    it('should be blocked by the edge of the grid', () => {
      expect(sut.forcedMove('A', 'PULL', true)).toBe('BLOCKED')
    })

    it('should be blocked when rooted', () => {
      expect(sut.forcedMove('B', 'PUSH', false)).toBe('BLOCKED')
    })
  })

  describe('Forced swap (D111)', () => {
    it('should be able to swap the target with an adjacent enemy', () => {
      // traz o C (meio) para o lugar do B (frente da linha 0)
      expect(sut.forcedSwap('B', 'C', { ref: true, withRef: true })).toBe(
        'MOVED'
      )
      expect(sut.positionOf('B')).toEqual({ row: 1, column: 1 })
      expect(sut.positionOf('C')).toEqual({ row: 0, column: 1 })
    })

    it('should be blocked when the two are not adjacent', () => {
      expect(sut.forcedSwap('A', 'C', { ref: true, withRef: true })).toBe(
        'BLOCKED'
      )
    })

    it('should be blocked when one of them is rooted', () => {
      expect(sut.forcedSwap('A', 'B', { ref: true, withRef: false })).toBe(
        'BLOCKED'
      )
      expect(sut.positionOf('A')).toEqual({ row: 0, column: 0 })
    })
  })

  it('should stop counting a defeated unit', () => {
    sut.remove('B')

    expect(sut.isEmpty({ row: 0, column: 1 })).toBe(true)
    expect(sut.units()).toHaveLength(3)
  })
})
