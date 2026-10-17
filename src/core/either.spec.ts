import { describe, expect, it } from 'vitest'
import { left, right } from './either'

describe('Either', () => {
  it('should be able to create a success result', () => {
    const sut = right<string, number>(10)

    expect(sut.isRight()).toBe(true)
    expect(sut.isLeft()).toBe(false)
    expect(sut.value).toBe(10)
  })

  it('should be able to create an error result', () => {
    const sut = left<string, number>('error')

    expect(sut.isLeft()).toBe(true)
    expect(sut.isRight()).toBe(false)
    expect(sut.value).toBe('error')
  })
})
