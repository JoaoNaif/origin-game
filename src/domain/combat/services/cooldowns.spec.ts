import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { beforeEach, describe, expect, it } from 'vitest'
import { CooldownSkill, SkillCooldowns } from './cooldowns'

const skill = (
  key: string,
  tier: SkillTier,
  cooldown: number,
  power = 1
): CooldownSkill => ({
  key,
  tier,
  cooldown,
  effects: [{ type: 'DAMAGE', power }],
})

const BUILD = [
  skill('basic', SkillTier.BASIC, 0, 0.8),
  skill('standard', SkillTier.STANDARD, 1, 1),
  skill('strong', SkillTier.STRONG, 3, 1.6),
  skill('final', SkillTier.FINAL, 4, 2),
]

describe('Skill Cooldowns', () => {
  let sut: SkillCooldowns

  beforeEach(() => {
    sut = new SkillCooldowns(BUILD)
  })

  it('should be able to start with every skill ready', () => {
    expect(sut.ready()).toHaveLength(4)
  })

  it('should be able to keep a skill out for N of its own turns', () => {
    sut.use('standard') // recarga 1
    sut.endTurn()

    expect(sut.isReady('standard')).toBe(false) // fora do próximo turno
    sut.endTurn()
    expect(sut.isReady('standard')).toBe(true)
  })

  it('should be able to use a basic skill every turn', () => {
    sut.use('basic')
    sut.endTurn()

    expect(sut.isReady('basic')).toBe(true)
  })

  describe('Lock (D110)', () => {
    it('should be able to lock the strongest ready skill', () => {
      expect(sut.lock()).toBe('final')
      expect(sut.turnsLeft('final')).toBe(2)
    })

    it('should be able to skip skills already in cooldown', () => {
      sut.use('final')
      sut.endTurn()

      expect(sut.lock()).toBe('strong')
    })

    it('should be able to break a tier tie by power', () => {
      const tied = new SkillCooldowns([
        skill('weak-strong', SkillTier.STRONG, 3, 1.4),
        skill('hard-strong', SkillTier.STRONG, 3, 1.6),
      ])

      expect(tied.lock()).toBe('hard-strong')
    })

    it('should be able to lock the soonest ready one when nothing is ready', () => {
      const onlyTwo = new SkillCooldowns([
        skill('strong', SkillTier.STRONG, 3),
        skill('final', SkillTier.FINAL, 4),
      ])
      onlyTwo.use('strong')
      onlyTwo.use('final')
      onlyTwo.endTurn() // strong 3, final 4

      expect(onlyTwo.lock()).toBe('strong')
      expect(onlyTwo.turnsLeft('strong')).toBe(5)
    })
  })
})
