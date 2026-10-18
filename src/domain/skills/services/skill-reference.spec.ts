import { describe, expect, it } from 'vitest'
import { SkillArea } from '../enums/skill-area'
import { SkillRange } from '../enums/skill-range'
import { SkillTarget } from '../enums/skill-target'
import { SkillTier } from '../enums/skill-tier'
import { skillReference } from './skill-reference'

describe('Skill Reference', () => {
  it('should be able to return the tier values for a single melee skill', () => {
    const sut = skillReference({
      tier: SkillTier.STRONG,
      target: SkillTarget.ENEMY,
      range: SkillRange.MELEE,
      area: SkillArea.SINGLE,
    })

    expect(sut).toEqual({
      power: 1.6,
      desgastePercent: 5,
      cooldown: 3,
      minLevel: 40,
    })
  })

  it('should be able to combine range and area modifiers', () => {
    const sut = skillReference({
      tier: SkillTier.STRONG,
      target: SkillTarget.ENEMY,
      range: SkillRange.RANGED,
      area: SkillArea.LINE,
    })

    expect(sut.power).toBe(1.22)
    expect(sut.desgastePercent).toBe(8.13)
  })

  it('should be able to apply the none modifier', () => {
    const sut = skillReference({
      tier: SkillTier.BASIC,
      target: SkillTarget.ENEMY,
      range: SkillRange.MELEE,
      area: SkillArea.SINGLE,
      isNone: true,
    })

    expect(sut).toMatchObject({
      power: 0.68,
      desgastePercent: 0.5,
      cooldown: 0,
    })
  })

  it('should be able to apply the squad modifier to ally area skills', () => {
    const sut = skillReference({
      tier: SkillTier.STANDARD,
      target: SkillTarget.ALLY,
      area: SkillArea.GRID,
    })

    expect(sut.power).toBe(0.7)
    expect(sut.desgastePercent).toBe(1.95)
  })
})
