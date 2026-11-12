import { describe, expect, it } from 'vitest'
import { Stat } from '@/domain/characters/enums/stat'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { InvalidBeastError } from '../errors/invalid-beast-error'
import { BeastSkill, BeastTemplate, BeastTemplateProps } from './beast-template'

const bite: BeastSkill = {
  name: 'Mordida',
  tier: SkillTier.BASIC,
  target: SkillTarget.ENEMY,
  range: SkillRange.MELEE,
  area: SkillArea.SINGLE,
  cooldown: 0,
  baseHitChance: 0.9,
  effects: [{ type: 'DAMAGE', power: 0.8 }],
}

function input(override: Partial<BeastTemplateProps> = {}): BeastTemplateProps {
  return {
    key: 'besta-de-teste',
    name: 'Besta de Teste',
    contract: 'DOMINANCE',
    grade: 'KNIGHT',
    lineage: 'ELEMENTAL',
    skills: [bite, { ...bite, name: 'Outra mordida' }],
    requirements: [],
    titles: [],
    ...override,
  }
}

describe('Beast Template', () => {
  it('should be able to create a beast with 2 skills that pass the skill rules', () => {
    expect(BeastTemplate.create(input()).isRight()).toBe(true)
  })

  it('should not be able to create a beast in the field without exactly 2 skills, or with invalid ones', () => {
    expect(
      BeastTemplate.create(input({ skills: [bite] })).value
    ).toBeInstanceOf(InvalidBeastError)
    expect(
      BeastTemplate.create(input({ skills: [bite, { ...bite, range: null }] }))
        .value
    ).toBeInstanceOf(InvalidBeastError)
  })

  it('should be able to create an Igualdade beast with no skills (it does not act)', () => {
    expect(
      BeastTemplate.create(
        input({ contract: 'EQUALITY', skills: [] })
      ).isRight()
    ).toBe(true)
    expect(
      BeastTemplate.create(input({ contract: 'EQUALITY' })).value
    ).toBeInstanceOf(InvalidBeastError)
  })

  it('should be able to ask requirements only on the Mestre contract, by grade', () => {
    const master = input({
      contract: 'MASTER',
      grade: 'MASTER',
      requirements: [
        { stat: Stat.SPEED, level: 'HIGH' },
        { stat: Stat.PRECISION, level: 'HIGH' },
        { stat: Stat.HP, level: 'LOW' },
      ],
      titles: ['Vidente'],
    })

    expect(BeastTemplate.create(master).isRight()).toBe(true)
    expect(
      BeastTemplate.create({
        ...master,
        requirements: master.requirements.slice(0, 2),
      }).value
    ).toBeInstanceOf(InvalidBeastError)
    expect(
      BeastTemplate.create(input({ requirements: master.requirements })).value
    ).toBeInstanceOf(InvalidBeastError)
  })
})
