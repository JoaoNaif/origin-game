import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { makeAccount } from 'test/factories/make-account'
import { makeBasicKit } from 'test/factories/make-basic-kit'
import { makeCharacterTemplate } from 'test/factories/make-character-template'
import { makeSkill } from 'test/factories/make-skill'
import { makeVariant } from 'test/factories/make-variant'
import { beforeEach, describe, expect, it } from 'vitest'
import { CharacterSkillSource } from '../enums/character-skill-source'
import { Lineage } from '../enums/lineage'
import { Character } from './character'
import { CharacterTemplate } from './character-template'
import { Variant } from './variant'

describe('Character Skills', () => {
  let fire: Variant
  let template: CharacterTemplate
  let sut: Character

  const atLevel = (character: Character, level: number) =>
    Character.restore(
      {
        accountId: character.accountId,
        templateId: character.templateId,
        level,
        xp: 0,
        danger: character.danger,
        dangerPoints: 0,
        awakenedVariantId: character.awakenedVariantId,
        freePoints: { ...character.freePoints },
        traits: [...character.traits],
        skills: character.skills.map((s) => ({ ...s })),
      },
      character.id
    )

  beforeEach(() => {
    fire = makeVariant({}, new UniqueEntityId('fire-id'))
    template = makeCharacterTemplate({
      variants: [{ variant: fire, isPrimary: true }],
    })

    const created = Character.create({
      account: makeAccount(),
      template,
      kitSkills: makeBasicKit(template, [fire]),
    })
    if (created.isLeft()) throw created.value

    sut = atLevel(created.value, 40)
  })

  describe('Learn Skill', () => {
    it('should be able to learn an offered skill of its own variant', () => {
      const flameWave = makeSkill({
        key: 'flame-wave',
        variant: fire,
        tier: SkillTier.STRONG,
        minLevel: 40,
        effects: [{ type: 'DAMAGE', power: 1.6 }],
      })

      const result = sut.learnSkill(flameWave, template)

      expect(result.isRight()).toBe(true)
      const learned = sut.skills.find((s) => s.skill.id.equals(flameWave.id))
      expect(learned?.source).toBe(CharacterSkillSource.OFFER)
      expect(learned?.buildSlot).toBeNull()
    })

    it('should not be able to learn a skill above its level', () => {
      const final = makeSkill({
        key: 'inferno',
        variant: fire,
        tier: SkillTier.FINAL,
        minLevel: 60,
        effects: [{ type: 'DAMAGE', power: 2 }],
      })

      expect(sut.learnSkill(final, template).isLeft()).toBe(true)
    })

    it('should not be able to learn a skill of another variant', () => {
      const steel = makeVariant({
        key: 'steel',
        name: 'Aço',
        lineage: Lineage.MATERIAL,
      })

      const result = sut.learnSkill(
        makeSkill({ key: 'steel-strike', variant: steel }),
        template
      )

      expect(result.isLeft()).toBe(true)
    })

    it('should not be able to learn a none skill when it has a variant', () => {
      const result = sut.learnSkill(makeSkill({ key: 'dry-blow' }), template)

      expect(result.isLeft()).toBe(true)
    })

    it('should not be able to learn an awakened skill before awakening', () => {
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
      const character = atLevel(sut, 80)

      expect(character.learnSkill(blueInferno, template).isLeft()).toBe(true)

      character.awaken(blueFire, template)

      expect(character.learnSkill(blueInferno, template).isRight()).toBe(true)
    })

    it('should not be able to learn the same skill twice', () => {
      const kitSkill = sut.skills[0].skill

      expect(sut.learnSkill(kitSkill, template).isLeft()).toBe(true)
    })
  })

  describe('Equip Skills', () => {
    it('should be able to swap a kit skill for a learned one', () => {
      const flameWave = makeSkill({
        key: 'flame-wave',
        variant: fire,
        tier: SkillTier.STRONG,
        minLevel: 40,
        effects: [{ type: 'DAMAGE', power: 1.6 }],
      })
      sut.learnSkill(flameWave, template)
      const [first, second, third] = sut.skills.map((s) => s.skill.id)

      const result = sut.equipSkills([flameWave.id, first, second, third])

      expect(result.isRight()).toBe(true)
      expect(sut.build[0].skill.id.equals(flameWave.id)).toBe(true)
      expect(sut.build).toHaveLength(4)
      expect(sut.skills.filter((s) => s.buildSlot === null)).toHaveLength(1)
    })

    it('should not be able to equip fewer than 4 skills', () => {
      const ids = sut.skills.map((s) => s.skill.id).slice(0, 3)

      expect(sut.equipSkills(ids).isLeft()).toBe(true)
    })

    it('should not be able to equip a skill twice', () => {
      const [first, second, third] = sut.skills.map((s) => s.skill.id)

      expect(sut.equipSkills([first, first, second, third]).isLeft()).toBe(true)
    })

    it('should not be able to equip a skill it has not learned', () => {
      const [first, second, third] = sut.skills.map((s) => s.skill.id)

      const result = sut.equipSkills([
        first,
        second,
        third,
        new UniqueEntityId('unknown'),
      ])

      expect(result.isLeft()).toBe(true)
      expect(sut.build).toHaveLength(4)
    })
  })

  describe('Enhance Skill', () => {
    it('should be able to enhance a learned skill once', () => {
      const skillId = sut.skills[0].skill.id

      expect(sut.enhanceSkill(skillId).isRight()).toBe(true)
      expect(sut.skills[0].isEnhanced).toBe(true)
      expect(sut.enhanceSkill(skillId).isLeft()).toBe(true)
    })
  })
})
