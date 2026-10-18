import { CharacterClass } from '@/domain/characters/enums/character-class'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  InterceptAttack,
  InterceptCandidate,
  InterceptState,
} from './intercept'

const guardian = (
  override: Partial<InterceptCandidate> = {}
): InterceptCandidate => ({
  ref: 'GUARD',
  characterClass: CharacterClass.GUARDIAN,
  row: 0,
  column: 0,
  canAct: true,
  ...override,
})

// atirador aliado em 0:1, ao lado do Guardião em 0:0
const attack = (override: Partial<InterceptAttack> = {}): InterceptAttack => ({
  targetRef: 'MARKSMAN',
  targetCell: { row: 0, column: 1 },
  range: SkillRange.RANGED,
  area: SkillArea.SINGLE,
  ...override,
})

describe('Intercept', () => {
  let sut: InterceptState

  beforeEach(() => {
    sut = new InterceptState()
  })

  it('should be able to take a single hit aimed at an adjacent ally', () => {
    expect(sut.intercept(attack(), [guardian()], 1)).toBe('GUARD')
  })

  it('should be able to intercept only once per round', () => {
    sut.intercept(attack(), [guardian()], 1)

    expect(sut.intercept(attack(), [guardian()], 1)).toBeUndefined()
    expect(sut.intercept(attack(), [guardian()], 2)).toBe('GUARD')
  })

  it.each([
    ['área (linha)', { area: SkillArea.LINE }],
    ['perfurante', { range: SkillRange.PIERCING }],
    ['flanco', { range: SkillRange.FLANK }],
  ])('should not be able to intercept %s', (_, override) => {
    expect(sut.intercept(attack(override), [guardian()], 1)).toBeUndefined()
  })

  it('should not be able to protect an ally that is not adjacent', () => {
    expect(
      sut.intercept(
        attack({ targetCell: { row: 1, column: 1 } }),
        [guardian()],
        1
      )
    ).toBeUndefined()
  })

  it('should not be able to intercept while stunned or rooted', () => {
    expect(
      sut.intercept(attack(), [guardian({ canAct: false })], 1)
    ).toBeUndefined()
  })

  it('should be able to follow the guardian order when there are two', () => {
    const second = guardian({ ref: 'GUARD-2', row: 1, column: 1 })
    const target = attack({ targetCell: { row: 0, column: 1 } }) // vizinho dos dois

    expect(sut.intercept(target, [second, guardian()], 1)).toBe('GUARD-2')
    expect(sut.intercept(target, [second, guardian()], 1)).toBe('GUARD')
  })

  it('should not be able to be used by other classes', () => {
    expect(
      sut.intercept(
        attack(),
        [guardian({ characterClass: CharacterClass.VANGUARD })],
        1
      )
    ).toBeUndefined()
  })
})
