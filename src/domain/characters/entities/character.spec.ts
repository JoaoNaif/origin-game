import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Account } from '@/domain/accounts/entities/account'
import { makeAccount } from 'test/factories/make-account'
import { makeBasicKit } from 'test/factories/make-basic-kit'
import { makeCharacterTemplate } from 'test/factories/make-character-template'
import { makeTrait } from 'test/factories/make-trait'
import { makeVariant } from 'test/factories/make-variant'
import { beforeEach, describe, expect, it } from 'vitest'
import { DangerLevel } from '../enums/danger-level'
import { Lineage } from '../enums/lineage'
import { Stat } from '../enums/stat'
import { TraitSource } from '../enums/trait-source'
import { InvalidCharacterError } from '../errors/invalid-character-error'
import { xpToNextLevel } from '../services/level-curve'
import { StatBlock } from '../value-objects/stat-block'
import { Character, EMPTY_FREE_POINTS } from './character'
import { CharacterTemplate } from './character-template'
import { Variant } from './variant'

const points = (override: Partial<StatBlock>): StatBlock => ({
  ...EMPTY_FREE_POINTS,
  ...override,
})

describe('Character', () => {
  let account: Account
  let fire: Variant
  let template: CharacterTemplate

  beforeEach(() => {
    account = makeAccount()
    fire = makeVariant({}, new UniqueEntityId('fire-id'))
    template = makeCharacterTemplate({
      variants: [{ variant: fire, isPrimary: true }],
      initialDanger: DangerLevel.CONTINUOUS,
    })
  })

  const createCharacter = (level = 0, kitVariants: Variant[] = [fire]) => {
    const created = Character.create({
      account,
      template,
      kitSkills: makeBasicKit(template, kitVariants),
    })
    if (created.isLeft()) throw created.value
    const character = created.value

    return Character.restore(
      {
        accountId: character.accountId,
        templateId: character.templateId,
        level,
        xp: 0,
        danger: character.danger,
        dangerPoints: 0,
        awakenedVariantId: null,
        freePoints: { ...EMPTY_FREE_POINTS },
        traits: [],
        skills: character.skills.map((s) => ({ ...s })),
      },
      character.id
    )
  }

  describe('Create Character', () => {
    it('should be able to create a level 0 character from a template', () => {
      const sut = Character.create({
        account,
        template,
        kitSkills: makeBasicKit(template, [fire]),
      })

      expect(sut.isRight()).toBe(true)
      if (sut.isRight()) {
        expect(sut.value.level).toBe(0)
        expect(sut.value.danger).toBe(DangerLevel.CONTINUOUS)
        expect(sut.value.traits).toHaveLength(0)
        expect(sut.value.isAwakened).toBe(false)
        expect(sut.value.skills).toHaveLength(4)
        expect(sut.value.build.map((s) => s.buildSlot)).toEqual([1, 2, 3, 4])
      }
    })

    it('should not be able to create a character with an invalid kit', () => {
      const kit = makeBasicKit(template, [fire])

      const sut = Character.create({
        account,
        template,
        kitSkills: kit.slice(0, 3),
      })

      expect(sut.isLeft()).toBe(true)
    })

    it('should not be able to split the kit wrongly between two variants', () => {
      const steel = makeVariant({
        key: 'steel',
        name: 'Aço',
        lineage: Lineage.MATERIAL,
      })
      const dual = makeCharacterTemplate({
        variants: [
          { variant: fire, isPrimary: true },
          { variant: steel, isPrimary: false },
        ],
      })

      const sut = Character.create({
        account,
        template: dual,
        // 4 de fogo e 0 de aço: deveria ser 2 e 2 (D97)
        kitSkills: makeBasicKit(dual, [fire]),
      })

      expect(sut.isLeft()).toBe(true)
      expect(
        Character.create({
          account,
          template: dual,
          kitSkills: makeBasicKit(dual, [fire, steel]),
        }).isRight()
      ).toBe(true)
    })

    it('should be able to copy the family trait into the traits list', () => {
      const familyTrait = makeTrait({
        key: 'family-pyranth',
        source: TraitSource.TEMPLATE,
        variantId: fire.id,
      })
      const familyTemplate = makeCharacterTemplate({
        variants: [{ variant: fire, isPrimary: true }],
        familyTrait,
      })

      const sut = Character.create({
        account,
        template: familyTemplate,
        familyTrait,
        kitSkills: makeBasicKit(familyTemplate, [fire]),
      })

      expect(sut.isRight()).toBe(true)
      if (sut.isRight()) {
        expect(sut.value.traits).toHaveLength(1)
        expect(sut.value.traits[0].id.equals(familyTrait.id)).toBe(true)
      }
    })

    it('should not be able to skip the family trait of the template', () => {
      const familyTrait = makeTrait({
        key: 'family-pyranth',
        source: TraitSource.TEMPLATE,
        variantId: fire.id,
      })
      const familyTemplate = makeCharacterTemplate({
        variants: [{ variant: fire, isPrimary: true }],
        familyTrait,
      })

      const sut = Character.create({
        account,
        template: familyTemplate,
        kitSkills: makeBasicKit(familyTemplate, [fire]),
      })

      expect(sut.isLeft()).toBe(true)
      expect(sut.value).toBeInstanceOf(InvalidCharacterError)
    })
  })

  describe('Gain XP', () => {
    it('should be able to level up following the curve', () => {
      const sut = createCharacter()

      const gained = sut.gainXp(xpToNextLevel(0) + 10)

      expect(gained).toBe(1)
      expect(sut.level).toBe(1)
      expect(sut.xp).toBe(10)
    })

    it('should not be able to go past level 100', () => {
      const sut = createCharacter()

      sut.gainXp(10_000_000)

      expect(sut.level).toBe(100)
      expect(sut.xp).toBe(0)
    })
  })

  describe('Add Trait', () => {
    it('should be able to add a conquered trait', () => {
      const sut = createCharacter()

      const result = sut.addTrait(makeTrait())

      expect(result.isRight()).toBe(true)
      expect(sut.traits).toHaveLength(1)
    })

    it('should not be able to add a template trait', () => {
      const sut = createCharacter()

      const result = sut.addTrait(
        makeTrait({ source: TraitSource.TEMPLATE, variantId: fire.id })
      )

      expect(result.isLeft()).toBe(true)
    })

    it('should not be able to add the same trait twice', () => {
      const sut = createCharacter()
      const trait = makeTrait()
      sut.addTrait(trait)

      const result = sut.addTrait(trait)

      expect(result.isLeft()).toBe(true)
    })

    it('should not be able to have more than 5 traits', () => {
      const sut = createCharacter()
      for (let i = 0; i < 5; i++) {
        sut.addTrait(
          makeTrait({
            key: `trait-${i}`,
            effects: [{ type: 'EXTRA_BEAST_SLOT', count: 1 }],
          })
        )
      }

      const result = sut.addTrait(makeTrait({ key: 'trait-6' }))

      expect(sut.traits).toHaveLength(5)
      expect(result.isLeft()).toBe(true)
    })

    it('should not be able to pass +15% on the same stat', () => {
      const sut = createCharacter()
      sut.addTrait(
        makeTrait({
          key: 'a',
          effects: [{ type: 'STAT_MODIFIER', stat: Stat.ATTACK, percent: 10 }],
        })
      )

      const result = sut.addTrait(
        makeTrait({
          key: 'b',
          effects: [{ type: 'STAT_MODIFIER', stat: Stat.ATTACK, percent: 6 }],
        })
      )

      expect(result.isLeft()).toBe(true)
    })
  })

  describe('Allocate Free Points', () => {
    it('should be able to allocate the points granted by level', () => {
      const sut = createCharacter(20)

      const result = sut.allocateFreePoints(
        points({ ATTACK: 10, DEFENSE: 10 }),
        template
      )

      expect(result.isRight()).toBe(true)
      expect(sut.freePoints.ATTACK).toBe(10)
    })

    it('should not be able to use more points than the level grants', () => {
      const sut = createCharacter(20)

      const result = sut.allocateFreePoints(points({ DEFENSE: 21 }), template)

      expect(result.isLeft()).toBe(true)
    })

    it('should not be able to pass the class cap of a stat', () => {
      const sut = createCharacter(100)

      // Vanguarda: Ataque não é pico (×1,10): 110 − 85 = 25 pontos no máximo
      const result = sut.allocateFreePoints(points({ ATTACK: 26 }), template)

      expect(result.isLeft()).toBe(true)
    })
  })

  describe('Awaken', () => {
    let blueFire: Variant

    beforeEach(() => {
      blueFire = makeVariant({
        key: 'blue-fire',
        name: 'Fogo azul',
        awakensFrom: fire,
      })
    })

    it('should be able to awaken into an awakened variant of its own', () => {
      const sut = createCharacter(80)

      const result = sut.awaken(blueFire, template)

      expect(result.isRight()).toBe(true)
      expect(sut.awakenedVariantId?.equals(blueFire.id)).toBe(true)
    })

    it('should not be able to awaken before level 80', () => {
      const sut = createCharacter(79)

      expect(sut.awaken(blueFire, template).isLeft()).toBe(true)
    })

    it('should not be able to awaken with more than one variant', () => {
      const steel = makeVariant({
        key: 'steel',
        name: 'Aço',
        lineage: Lineage.MATERIAL,
      })
      template = makeCharacterTemplate({
        variants: [
          { variant: fire, isPrimary: true },
          { variant: steel, isPrimary: false },
        ],
      })
      const sut = createCharacter(80, [fire, steel])

      expect(sut.awaken(blueFire, template).isLeft()).toBe(true)
    })

    it('should not be able to awaken into another variant', () => {
      const steel = makeVariant({
        key: 'steel',
        name: 'Aço',
        lineage: Lineage.MATERIAL,
      })
      const steelAwakened = makeVariant({
        key: 'living-steel',
        name: 'Aço vivo',
        lineage: Lineage.MATERIAL,
        awakensFrom: steel,
      })
      const sut = createCharacter(80)

      expect(sut.awaken(steelAwakened, template).isLeft()).toBe(true)
    })

    it('should not be able to awaken twice', () => {
      const sut = createCharacter(80)
      sut.awaken(blueFire, template)

      expect(sut.awaken(blueFire, template).isLeft()).toBe(true)
    })
  })
})
