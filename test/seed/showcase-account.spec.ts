import { beforeEach, describe, expect, it } from 'vitest'
import { Account } from '@/domain/accounts/entities/account'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { templateKit } from '@/domain/catalog/services/template-skills'
import { Character } from '@/domain/characters/entities/character'
import { buildPlayerSide } from '@/domain/combat/services/build-snapshot'
import { Squad } from '@/domain/squads/entities/squad'
import { makeAccount } from 'test/factories/make-account'
import { makeRoster } from 'test/factories/make-roster'
import { seedCatalog } from 'test/repositories/in-memory-catalog-repository'
import {
  bestShowcaseGear,
  prepareShowcaseCharacter,
  SHOWCASE_CHARACTERS,
  SHOWCASE_STORED_GEAR,
} from '../../prisma/seed/seed-showcase-account'
import { characterGearBond } from '@/domain/gear/services/gear-bond'

describe('Showcase Account', () => {
  let catalog: GameCatalog
  let account: Account
  let sut: Character[]

  beforeEach(() => {
    catalog = seedCatalog()
    account = makeAccount()
    const roster = makeRoster(account, catalog)

    sut = SHOWCASE_CHARACTERS.map((spec) => {
      const template = [...catalog.templates.values()].find(
        (t) => t.key === spec.key
      )!
      let character = roster.find((c) => c.templateId.equals(template.id))
      if (!character) {
        const granted = Character.create({
          account,
          template,
          familyTrait: template.familyTraitId
            ? catalog.traits.get(template.familyTraitId.toValue())
            : null,
          kitSkills: templateKit(catalog, template),
        })
        if (granted.isLeft()) throw granted.value
        character = granted.value
      }
      prepareShowcaseCharacter(character, spec, template, catalog)
      return character
    })
  })

  it('should be able to awaken Nox, Gaia and Oren with awakened skills in the build', () => {
    const [kael, ...awakened] = sut

    expect(kael.isAwakened).toBe(false)
    for (const character of awakened) {
      expect(character.awakeningHint).toBe('AWAKENED')
      expect(character.build).toHaveLength(4)
      expect(character.build.filter((s) => s.skill.isAwakened).length).toBe(3)
    }
  })

  it('should be able to train the DOM of each one to the planned levels', () => {
    sut.forEach((character, i) => {
      expect(character.domPillars).toEqual(SHOWCASE_CHARACTERS[i].dom)
    })
  })

  it('should be able to bring every unique skill to the battle', () => {
    const squad = Squad.create({
      account,
      name: 'Vitrine',
      members: sut.map((character, i) => ({
        character,
        row: SHOWCASE_CHARACTERS[i].row,
        column: SHOWCASE_CHARACTERS[i].column,
      })),
    })
    if (squad.isLeft()) throw squad.value

    const side = buildPlayerSide({
      account,
      squad: squad.value,
      characters: sut,
      catalog,
    })
    if (side.isLeft()) throw side.value

    const unique = side.value.units.flatMap((u) =>
      u.skills.filter((s) => s.singleUse).map((s) => s.name)
    )
    expect(unique.sort()).toEqual(
      ['Indestrutível', 'Rei', 'Resiliente', 'Vidente'].sort()
    )
  })

  it('should be able to give each one the seed gear with the best bond, all different', () => {
    const used = new Set<string>(SHOWCASE_STORED_GEAR)
    const picked = sut.map((character) => {
      const template = catalog.templates.get(character.templateId.toValue())!
      const gear = bestShowcaseGear(character, template, catalog, used)
      used.add(gear.key)
      return { gear, bond: characterGearBond(gear, character, template).bond }
    })

    expect(new Set(picked.map((p) => p.gear.key)).size).toBe(4)
    expect(picked.every((p) => !p.gear.isDivine)).toBe(true)
    expect(picked.some((p) => p.bond === 'FULL')).toBe(true)
  })
})
