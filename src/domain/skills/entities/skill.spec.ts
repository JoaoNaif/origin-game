import { Variant } from '@/domain/characters/entities/variant'
import { CharacterClass } from '@/domain/characters/enums/character-class'
import { Lineage } from '@/domain/characters/enums/lineage'
import { makeSkillInput } from 'test/factories/make-skill'
import { makeVariant } from 'test/factories/make-variant'
import { beforeEach, describe, expect, it } from 'vitest'
import { SkillArea } from '../enums/skill-area'
import { SkillKitSlot } from '../enums/skill-kit-slot'
import { SkillRange } from '../enums/skill-range'
import { SkillTarget } from '../enums/skill-target'
import { SkillTier } from '../enums/skill-tier'
import { StatusType } from '../enums/status-type'
import { InvalidSkillError } from '../errors/invalid-skill-error'
import { Skill } from './skill'

describe('Create Skill', () => {
  let fire: Variant

  beforeEach(() => {
    fire = makeVariant()
  })

  it('should be able to create a variant skill that takes its lineage', () => {
    const sut = Skill.create(
      makeSkillInput({
        key: 'fire-strike',
        variant: fire,
        kitClass: CharacterClass.VANGUARD,
        kitSlot: SkillKitSlot.BASIC,
      })
    )

    expect(sut.isRight()).toBe(true)
    if (sut.isRight()) {
      expect(sut.value.lineage).toBe(Lineage.ELEMENTAL)
      expect(sut.value.isNone).toBe(false)
      expect(sut.value.isKit).toBe(true)
    }
  })

  it('should be able to create a none skill without variant', () => {
    const sut = Skill.create(
      makeSkillInput({
        key: 'dry-blow',
        desgastePercent: 0.5,
        effects: [{ type: 'DAMAGE', power: 0.68 }],
      })
    )

    expect(sut.isRight()).toBe(true)
    if (sut.isRight()) {
      expect(sut.value.isNone).toBe(true)
      expect(sut.value.variantId).toBeNull()
    }
  })

  it('should be able to create an ally heal without range nor hit test', () => {
    const sut = Skill.create(
      makeSkillInput({
        key: 'cauterize',
        variant: fire,
        tier: SkillTier.STANDARD,
        target: SkillTarget.ALLY,
        range: null,
        baseHitChance: null,
        cooldown: 1,
        desgastePercent: 1.5,
        effects: [{ type: 'HEAL', power: 1 }],
      })
    )

    expect(sut.isRight()).toBe(true)
  })

  it('should be able to combine damage and a status', () => {
    const sut = Skill.create(
      makeSkillInput({
        key: 'flame-wave',
        variant: fire,
        tier: SkillTier.STRONG,
        range: SkillRange.RANGED,
        area: SkillArea.LINE,
        cooldown: 3,
        desgastePercent: 8.13,
        minLevel: 40,
        effects: [
          { type: 'DAMAGE', power: 1.22 },
          {
            type: 'APPLY_STATUS',
            status: StatusType.DOT,
            duration: 3,
            baseChance: 0.8,
          },
        ],
      })
    )

    expect(sut.isRight()).toBe(true)
  })

  it('should not be able to create a skill without effects', () => {
    const sut = Skill.create(makeSkillInput({ effects: [] }))

    expect(sut.isLeft()).toBe(true)
    expect(sut.value).toBeInstanceOf(InvalidSkillError)
  })

  it('should not be able to target an enemy without range', () => {
    const sut = Skill.create(makeSkillInput({ range: null }))

    expect(sut.isLeft()).toBe(true)
  })

  it('should not be able to give range to an ally skill', () => {
    const sut = Skill.create(
      makeSkillInput({
        target: SkillTarget.ALLY,
        baseHitChance: null,
        effects: [{ type: 'HEAL', power: 1 }],
      })
    )

    expect(sut.isLeft()).toBe(true)
  })

  it('should not be able to use a self skill on an area', () => {
    const sut = Skill.create(
      makeSkillInput({
        target: SkillTarget.SELF,
        range: null,
        baseHitChance: null,
        area: SkillArea.GRID,
        effects: [{ type: 'SHIELD', power: 1 }],
      })
    )

    expect(sut.isLeft()).toBe(true)
  })

  it('should not be able to unlock a tier below its minimum level', () => {
    const sut = Skill.create(
      makeSkillInput({
        tier: SkillTier.FINAL,
        minLevel: 40,
        effects: [{ type: 'DAMAGE', power: 2 }],
      })
    )

    expect(sut.isLeft()).toBe(true)
  })

  it('should not be able to exceed the max power', () => {
    const sut = Skill.create(
      makeSkillInput({ effects: [{ type: 'DAMAGE', power: 3 }] })
    )

    expect(sut.isLeft()).toBe(true)
  })

  it('should not be able to set only half of the kit fields', () => {
    const sut = Skill.create(
      makeSkillInput({ kitClass: CharacterClass.VANGUARD })
    )

    expect(sut.isLeft()).toBe(true)
  })

  it('should not be able to unlock an awakened skill before level 80', () => {
    const blueFire = makeVariant({
      key: 'blue-fire',
      name: 'Fogo azul',
      awakensFrom: fire,
    })

    const sut = Skill.create(
      makeSkillInput({
        variant: blueFire,
        tier: SkillTier.FINAL,
        minLevel: 60,
        effects: [{ type: 'DAMAGE', power: 2.5 }],
      })
    )

    expect(sut.isLeft()).toBe(true)
  })

  it('should be able to create an awakened skill from level 80', () => {
    const blueFire = makeVariant({
      key: 'blue-fire',
      name: 'Fogo azul',
      awakensFrom: fire,
    })

    const sut = Skill.create(
      makeSkillInput({
        variant: blueFire,
        tier: SkillTier.FINAL,
        minLevel: 80,
        cooldown: 4,
        desgastePercent: 12,
        effects: [{ type: 'DAMAGE', power: 2.5 }],
      })
    )

    expect(sut.isRight()).toBe(true)
    if (sut.isRight()) {
      expect(sut.value.isAwakened).toBe(true)
    }
  })
})
