import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { AiDifficulty } from '@/domain/ai/enums/ai-difficulty'
import { AiProfile } from '@/domain/ai/enums/ai-profile'
import { CharacterTemplate } from '@/domain/characters/entities/character-template'
import { Variant } from '@/domain/characters/entities/variant'
import { Lineage } from '@/domain/characters/enums/lineage'
import { TraitSource } from '@/domain/characters/enums/trait-source'
import { Skill } from '@/domain/skills/entities/skill'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { makeCharacterTemplate } from 'test/factories/make-character-template'
import { makeSkill } from 'test/factories/make-skill'
import { makeTrait } from 'test/factories/make-trait'
import { makeVariant } from 'test/factories/make-variant'
import { beforeEach, describe, expect, it } from 'vitest'
import { InvalidNpcSquadError } from '../errors/invalid-npc-squad-error'
import { NpcSquad, NpcSquadMemberInput } from './npc-squad'

describe('Create Npc Squad', () => {
  let templates: CharacterTemplate[]
  let noneSkills: Skill[]

  const cells = [
    { row: 0, column: 0 },
    { row: 2, column: 0 },
    { row: 1, column: 1 },
    { row: 1, column: 2 },
  ]

  const members = (level: number): NpcSquadMemberInput[] =>
    templates.map((template, index) => ({
      template,
      level,
      skills: noneSkills,
      ...cells[index],
    }))

  beforeEach(() => {
    templates = [0, 1, 2, 3].map((i) =>
      makeCharacterTemplate(
        { key: `npc-${i}` },
        new UniqueEntityId(`npc-template-${i}`)
      )
    )
    noneSkills = [0, 1, 2, 3].map((i) => makeSkill({ key: `none-${i}` }))
  })

  it('should be able to create a beginner squad', () => {
    const sut = NpcSquad.create({
      key: 'beginner-wall',
      name: 'Muralha de recrutas',
      profile: AiProfile.CAUTIOUS,
      difficulty: AiDifficulty.BEGINNER,
      members: members(15),
    })

    expect(sut.isRight()).toBe(true)
    if (sut.isRight()) {
      expect(sut.value.members).toHaveLength(4)
      expect(sut.value.members[0].skillIds).toHaveLength(4)
    }
  })

  it('should not be able to use a level outside the difficulty range', () => {
    const sut = NpcSquad.create({
      key: 'too-strong',
      name: 'Forte demais',
      profile: AiProfile.AGGRESSIVE,
      difficulty: AiDifficulty.BEGINNER,
      members: members(30),
    })

    expect(sut.isLeft()).toBe(true)
    expect(sut.value).toBeInstanceOf(InvalidNpcSquadError)
  })

  it('should not be able to repeat a template', () => {
    const list = members(15)
    list[1] = { ...list[1], template: templates[0] }

    const sut = NpcSquad.create({
      key: 'clones',
      name: 'Clones',
      profile: AiProfile.BALANCED,
      difficulty: AiDifficulty.BEGINNER,
      members: list,
    })

    expect(sut.isLeft()).toBe(true)
  })

  it('should not be able to put two members on the same cell', () => {
    const list = members(15)
    list[1] = { ...list[1], row: 0, column: 0 }

    const sut = NpcSquad.create({
      key: 'stacked',
      name: 'Empilhado',
      profile: AiProfile.BALANCED,
      difficulty: AiDifficulty.BEGINNER,
      members: list,
    })

    expect(sut.isLeft()).toBe(true)
  })

  it('should not be able to have a build without 4 skills', () => {
    const list = members(15)
    list[0] = { ...list[0], skills: noneSkills.slice(0, 3) }

    const sut = NpcSquad.create({
      key: 'short-build',
      name: 'Build curta',
      profile: AiProfile.BALANCED,
      difficulty: AiDifficulty.BEGINNER,
      members: list,
    })

    expect(sut.isLeft()).toBe(true)
  })

  it('should not be able to use a skill above the member level', () => {
    const final = makeSkill({
      key: 'none-final',
      tier: SkillTier.FINAL,
      minLevel: 60,
      effects: [{ type: 'DAMAGE', power: 2 }],
    })
    const list = members(15)
    list[0] = { ...list[0], skills: [...noneSkills.slice(0, 3), final] }

    const sut = NpcSquad.create({
      key: 'early-final',
      name: 'Final cedo',
      profile: AiProfile.AGGRESSIVE,
      difficulty: AiDifficulty.BEGINNER,
      members: list,
    })

    expect(sut.isLeft()).toBe(true)
  })

  describe('with variants', () => {
    let fire: Variant
    let fireTemplate: CharacterTemplate
    let fireSkills: Skill[]

    beforeEach(() => {
      fire = makeVariant({}, new UniqueEntityId('fire-id'))
      fireTemplate = makeCharacterTemplate(
        { key: 'npc-fire', variants: [{ variant: fire, isPrimary: true }] },
        new UniqueEntityId('npc-fire-template')
      )
      fireSkills = [0, 1, 2, 3].map((i) =>
        makeSkill({ key: `fire-${i}`, variant: fire })
      )
    })

    it('should not be able to use a none skill on a member with variant', () => {
      const list = members(15)
      list[0] = { ...list[0], template: fireTemplate, skills: noneSkills }

      const sut = NpcSquad.create({
        key: 'wrong-skills',
        name: 'Skills erradas',
        profile: AiProfile.BALANCED,
        difficulty: AiDifficulty.BEGINNER,
        members: list,
      })

      expect(sut.isLeft()).toBe(true)
    })

    it('should be able to field an awakened grandmaster', () => {
      const blueFire = makeVariant({
        key: 'blue-fire',
        name: 'Fogo azul',
        awakensFrom: fire,
      })
      const blueInferno = makeSkill({
        key: 'blue-inferno',
        variant: blueFire,
        tier: SkillTier.FINAL,
        minLevel: 80,
        effects: [{ type: 'DAMAGE', power: 2.5 }],
      })
      const list = members(95)
      list[0] = {
        ...list[0],
        template: fireTemplate,
        awakenedVariant: blueFire,
        skills: [...fireSkills.slice(0, 3), blueInferno],
      }

      const sut = NpcSquad.create({
        key: 'grandmaster-blue',
        name: 'Chama azul',
        profile: AiProfile.FINISHER,
        difficulty: AiDifficulty.GRANDMASTER,
        members: list,
      })

      expect(sut.isRight()).toBe(true)
      if (sut.isRight()) {
        expect(
          sut.value.members[0].awakenedVariantId?.equals(blueFire.id)
        ).toBe(true)
      }
    })

    it('should not be able to skip the family trait of the template', () => {
      const familyTrait = makeTrait({
        key: 'family-pyranth',
        source: TraitSource.TEMPLATE,
        variantId: fire.id,
      })
      const familyTemplate = makeCharacterTemplate(
        {
          key: 'npc-pyranth',
          variants: [{ variant: fire, isPrimary: true }],
          familyTrait,
        },
        new UniqueEntityId('npc-pyranth-template')
      )
      const list = members(15)
      list[0] = { ...list[0], template: familyTemplate, skills: fireSkills }

      const withoutFamily = NpcSquad.create({
        key: 'no-family',
        name: 'Sem família',
        profile: AiProfile.BALANCED,
        difficulty: AiDifficulty.BEGINNER,
        members: list,
      })

      list[0] = { ...list[0], traits: [familyTrait] }
      const withFamily = NpcSquad.create({
        key: 'with-family',
        name: 'Com família',
        profile: AiProfile.BALANCED,
        difficulty: AiDifficulty.BEGINNER,
        members: list,
      })

      expect(withoutFamily.isLeft()).toBe(true)
      expect(withFamily.isRight()).toBe(true)
    })

    it('should not be able to use a skill of another variant', () => {
      const steel = makeVariant({
        key: 'steel',
        name: 'Aço',
        lineage: Lineage.MATERIAL,
      })
      const list = members(15)
      list[0] = {
        ...list[0],
        template: fireTemplate,
        skills: [
          ...fireSkills.slice(0, 3),
          makeSkill({ key: 'steel-strike', variant: steel }),
        ],
      }

      const sut = NpcSquad.create({
        key: 'mixed-variants',
        name: 'Variantes misturadas',
        profile: AiProfile.BALANCED,
        difficulty: AiDifficulty.BEGINNER,
        members: list,
      })

      expect(sut.isLeft()).toBe(true)
    })
  })
})
