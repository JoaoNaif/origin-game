import { beforeEach, describe, expect, it } from 'vitest'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { InvalidEventError } from '../errors/invalid-event-error'
import { EventEntry } from './event-entry'

const day1 = new Date('2026-11-10T10:00:00Z')
const day1Later = new Date('2026-11-10T23:00:00Z')
const day2 = new Date('2026-11-11T01:00:00Z')

let sut: EventEntry

describe('Event Entry', () => {
  beforeEach(() => {
    sut = EventEntry.create({
      accountId: new UniqueEntityId(),
      eventId: new UniqueEntityId(),
      createdAt: day1,
    })
  })

  it('should be able to count the attempts per day and reset on the next day', () => {
    const limit = { count: 2, per: 'DAY' as const }
    sut.recordAttempt('FREE', ['a'], day1)
    sut.recordAttempt('FREE', ['a'], day1Later)

    expect(sut.attemptsLeft(limit, day1Later)).toBe(0)
    expect(sut.playError(limit, day1Later)).toMatch(/hoje/)
    expect(sut.attemptsLeft(limit, day2)).toBe(2)
    expect(sut.playError(limit, day2)).toBeNull()
  })

  it('should be able to count the attempts of the whole event', () => {
    const limit = { count: 1, per: 'EVENT' as const }
    sut.recordAttempt('FREE', ['a'], day1)

    expect(sut.attemptsLeft(limit, day2)).toBe(0)
    expect(sut.playError(limit, day2)).toMatch(/neste evento/)
  })

  it('should be able to play at will without a limit', () => {
    for (let i = 0; i < 10; i++) sut.recordAttempt('FREE', ['a'], day1)

    expect(sut.attemptsLeft(null, day1)).toBeNull()
    expect(sut.playError(null, day1)).toBeNull()
  })

  it('should be able to lock a fixed squad on the first battle', () => {
    sut.recordAttempt('FIXED', ['a', 'b', 'c', 'd'], day1)

    expect(sut.lockedCharacterIds).toEqual(['a', 'b', 'c', 'd'])
    expect(sut.checkSquad('FIXED', ['d', 'c', 'b', 'a']).isRight()).toBe(true)
    expect(sut.checkSquad('FIXED', ['a', 'b', 'c', 'e']).value).toBeInstanceOf(
      InvalidEventError
    )
  })

  it('should not lock a free squad', () => {
    sut.recordAttempt('FREE', ['a', 'b', 'c', 'd'], day1)

    expect(sut.lockedCharacterIds).toBeNull()
    expect(sut.checkSquad('FREE', ['e', 'f', 'g', 'h']).isRight()).toBe(true)
  })

  it('should be able to clear the stages in order and complete on the last', () => {
    expect(sut.clearStage(1, 2, day1)).toBe(false)
    expect(sut.clearedStages).toBe(0)

    expect(sut.clearStage(0, 2, day1)).toBe(false)
    expect(sut.clearStage(1, 2, day2)).toBe(true)
    expect(sut.isCompleted).toBe(true)
    expect(sut.completedAt).toEqual(day2)
    expect(sut.playError(null, day2)).toMatch(/concluiu/)
  })

  it('should be able to reset the capture failures when the stage is cleared', () => {
    sut.recordCaptureFailure()
    sut.recordCaptureFailure()
    expect(sut.captureFailures).toBe(2)

    sut.clearStage(0, 3, day1)

    expect(sut.captureFailures).toBe(0)
  })

  it('should be able to give the participation only once', () => {
    expect(sut.markParticipated()).toBe(true)
    expect(sut.markParticipated()).toBe(false)
  })
})
