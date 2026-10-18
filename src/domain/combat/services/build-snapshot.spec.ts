import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { AiDifficulty } from '@/domain/ai/enums/ai-difficulty'
import { AiProfile } from '@/domain/ai/enums/ai-profile'
import { Account } from '@/domain/accounts/entities/account'
import { Character } from '@/domain/characters/entities/character'
import { CharacterTemplate } from '@/domain/characters/entities/character-template'
import { Trait } from '@/domain/characters/entities/trait'
import { Variant } from '@/domain/characters/entities/variant'
import { Lineage } from '@/domain/characters/enums/lineage'
import { Stat } from '@/domain/characters/enums/stat'
import { TraitSource } from '@/domain/characters/enums/trait-source'
import { Skill } from '@/domain/skills/entities/skill'
import { NpcSquad } from '@/domain/squads/entities/npc-squad'
import { Squad } from '@/domain/squads/entities/squad'
import { makeAccount } from 'test/factories/make-account'
import { makeBasicKit } from 'test/factories/make-basic-kit'
import { makeCharacterTemplate } from 'test/factories/make-character-template'
import { makeSkill } from 'test/factories/make-skill'
import { makeSquad } from 'test/factories/make-squad'
import { makeTrait } from 'test/factories/make-trait'
import { makeVariant } from 'test/factories/make-variant'
import { beforeEach, describe, expect, it } from 'vitest'
import { Battle } from '../entities/battle'
import { BattleSide } from '../enums/battle-enums'
import { BuildSnapshotError } from '../errors/build-snapshot-error'
import {
  buildNpcSide,
  buildPlayerSide,
  buildPveSnapshot,
  SnapshotCatalog,
} from './build-snapshot'

const CELLS = [
  { row: 0, column: 0 },
  { row: 2, column: 0 },
  { row: 1, column: 1 },
  { row: 1, column: 2 },
]

const byId = <T extends { id: UniqueEntityId }>(items: T[]) =>
  new Map(items.map((item) => [item.id.toValue(), item]))

describe('Build Snapshot', () => {
  let account: Account
  let fire: Variant
  let familyTrait: Trait
  let veteran: Trait
  let templates: CharacterTemplate[]
  let characters: Character[]
  let squad: Squad
  let npcSquad: NpcSquad
  let skills: Skill[]
  let catalog: SnapshotCatalog

  beforeEach(() => {
    account = makeAccount({ displayName: 'Tester' })
    fire = makeVariant({}, new UniqueEntityId('fire-id'))
    familyTrait = makeTrait({
      key: 'family-pyranth',
      source: TraitSource.TEMPLATE,
      variantId: fire.id,
      effects: [{ type: 'STAT_MODIFIER', stat: Stat.HP, percent: 3 }],
    })
    veteran = makeTrait({ key: 'veteran' })

    const kael = makeCharacterTemplate(
      {
        key: 'kael-pyranth',
        name: 'Kael Pyranth',
        variants: [{ variant: fire, isPrimary: true }],
        familyTrait,
      },
      new UniqueEntityId('kael')
    )
    const recruits = [1, 2, 3].map((i) =>
      makeCharacterTemplate(
        { key: `recruit-${i}`, name: `Recruta ${i}` },
        new UniqueEntityId(`recruit-${i}`)
      )
    )
    templates = [kael, ...recruits]

    const kits = templates.map((template, i) =>
      makeBasicKit(template, i === 0 ? [fire] : [])
    )
    skills = kits.flat()

    characters = templates.map((template, i) => {
      const created = Character.create({
        account,
        template,
        familyTrait: i === 0 ? familyTrait : null,
        kitSkills: kits[i],
      })
      if (created.isLeft()) throw created.value

      return created.value
    })
    characters[0].gainXp(5_000)
    characters[0].addTrait(veteran)

    squad = makeSquad({
      account,
      name: 'Muralha',
      members: characters.map((character, i) => ({ character, ...CELLS[i] })),
    })

    const npcSkills = [0, 1, 2, 3].map((i) => makeSkill({ key: `npc-${i}` }))
    skills.push(...npcSkills)

    // a máquina usa os 3 recrutas mais um quarto modelo só dela
    const recruit4 = makeCharacterTemplate(
      { key: 'recruit-4', name: 'Recruta 4' },
      new UniqueEntityId('recruit-4')
    )
    templates.push(recruit4)

    const created = NpcSquad.create({
      key: 'beginner-wall',
      name: 'Muralha de recrutas',
      profile: AiProfile.CAUTIOUS,
      difficulty: AiDifficulty.BEGINNER,
      members: [...recruits, recruit4].map((template, i) => ({
        template,
        level: 20,
        skills: npcSkills,
        ...CELLS[i],
      })),
    })
    if (created.isLeft()) throw created.value
    npcSquad = created.value

    catalog = {
      templates: byId(templates),
      variants: byId([fire]),
      skills: byId(skills),
      traits: byId([familyTrait, veteran]),
    }
  })

  describe('Player Side', () => {
    it('should be able to take the squad as it is now', () => {
      const sut = buildPlayerSide({ account, squad, characters, catalog })

      expect(sut.isRight()).toBe(true)
      if (sut.isRight()) {
        const [kael] = sut.value.units
        expect(sut.value.name).toBe('Tester')
        expect(sut.value.units.map((u) => u.ref)).toEqual([
          'PLAYER:0',
          'PLAYER:1',
          'PLAYER:2',
          'PLAYER:3',
        ])
        expect(kael.name).toBe('Kael Pyranth')
        expect(kael.level).toBe(characters[0].level)
        expect(kael.lineages).toEqual([Lineage.ELEMENTAL])
        expect(kael.traitEffects).toHaveLength(2)
        expect(kael.skills).toHaveLength(4)
        expect(kael).toMatchObject({ row: 0, column: 0 })
      }
    })

    it('should keep values, not references, of the skills', () => {
      characters[0].enhanceSkill(characters[0].build[0].skill.id)

      const sut = buildPlayerSide({ account, squad, characters, catalog })

      if (sut.isLeft()) throw sut.value
      const skill = sut.value.units[0].skills[0]
      expect(skill.isEnhanced).toBe(true)
      expect(skill.effects).toEqual([{ type: 'DAMAGE', power: 0.8 }])
    })

    it('should not be able to use an incomplete squad', () => {
      const incomplete = Squad.restore(
        {
          accountId: squad.accountId,
          name: squad.name,
          members: squad.members.slice(0, 3),
        },
        squad.id
      )

      const sut = buildPlayerSide({
        account,
        squad: incomplete,
        characters,
        catalog,
      })

      expect(sut.isLeft()).toBe(true)
      expect(sut.value).toBeInstanceOf(BuildSnapshotError)
    })

    it('should not be able to use a squad of another account', () => {
      const sut = buildPlayerSide({
        account: makeAccount({ username: 'other_01' }),
        squad,
        characters,
        catalog,
      })

      expect(sut.isLeft()).toBe(true)
    })

    it('should not be able to build without the characters loaded', () => {
      const sut = buildPlayerSide({
        account,
        squad,
        characters: characters.slice(1),
        catalog,
      })

      expect(sut.isLeft()).toBe(true)
    })
  })

  describe('Npc Side', () => {
    it('should be able to give the default free points to the machine', () => {
      const sut = buildNpcSide({ npcSquad, catalog })

      expect(sut.isRight()).toBe(true)
      if (sut.isRight()) {
        const [first] = sut.value.units
        expect(sut.value.name).toBe('Muralha de recrutas')
        expect(first.ref).toBe('OPPONENT:0')
        expect(first.level).toBe(20)
        // Vanguarda no nível 20: 20 de 100 pontos na proporção do perfil (Defesa 18 × 0,2)
        expect(first.freePoints.DEFENSE).toBe(3)
        expect(first.skills.every((s) => !s.isEnhanced)).toBe(true)
      }
    })

    it('should not be able to build with a missing skill in the catalog', () => {
      const sut = buildNpcSide({
        npcSquad,
        catalog: { ...catalog, skills: new Map() },
      })

      expect(sut.isLeft()).toBe(true)
    })
  })

  describe('PvE Snapshot', () => {
    it('should be able to start a battle with the built snapshot', () => {
      const snapshot = buildPveSnapshot(
        { account, squad, characters, catalog },
        { npcSquad, catalog }
      )
      if (snapshot.isLeft()) throw snapshot.value

      const sut = Battle.startPve({
        account,
        squadId: squad.id,
        npcSquad,
        seed: 42,
        engineVersion: '0.1.0',
        contentVersion: 'seed-1',
        snapshot: snapshot.value,
        startedAt: new Date('2026-10-18T12:00:00Z'),
      })

      expect(sut.isRight()).toBe(true)
      expect(snapshot.value.opponent.side).toBe(BattleSide.OPPONENT)
    })
  })
})
