import { beforeEach, describe, expect, it } from 'vitest'
import { seedCatalog } from 'test/repositories/in-memory-catalog-repository'
import { InMemoryCharactersRepository } from 'test/repositories/in-memory-characters-repository'
import { makeAccount } from 'test/factories/make-account'
import { characterOf, makeRoster } from 'test/factories/make-roster'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Character } from '../../entities/character'
import { InvalidCharacterError } from '../../errors/invalid-character-error'
import { EquipSkillsUseCase } from './equip-skills'

let charactersRepository: InMemoryCharactersRepository
let kael: Character
let accountId: string
let sut: EquipSkillsUseCase

describe('Equip Skills', () => {
  beforeEach(async () => {
    const catalog = seedCatalog()
    const account = makeAccount()
    accountId = account.id.toString()
    const roster = makeRoster(account, catalog)
    kael = characterOf(roster, catalog, 'kael-vaz')

    charactersRepository = new InMemoryCharactersRepository()
    await charactersRepository.createMany(roster)
    sut = new EquipSkillsUseCase(charactersRepository)
  })

  it('should be able to reorder the build by skill key', async () => {
    const keys = kael.build.map((s) => s.skill.key).reverse()

    const result = await sut.execute({
      characterId: kael.id.toString(),
      accountId,
      skillKeys: keys,
    })

    expect(result.isRight()).toBe(true)
    expect(kael.build.map((s) => s.skill.key)).toEqual(keys)
  })

  it('should not be able to equip a skill the character did not learn', async () => {
    const keys = kael.build.map((s) => s.skill.key)
    keys[0] = 'ecko-nocthar:qualquer'

    const result = await sut.execute({
      characterId: kael.id.toString(),
      accountId,
      skillKeys: keys,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidCharacterError)
  })

  it('should not be able to equip fewer than 4 skills', async () => {
    const result = await sut.execute({
      characterId: kael.id.toString(),
      accountId,
      skillKeys: kael.build.slice(0, 3).map((s) => s.skill.key),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidCharacterError)
  })

  it('should not be able to change the build of another account', async () => {
    const result = await sut.execute({
      characterId: kael.id.toString(),
      accountId: 'outra-conta',
      skillKeys: kael.build.map((s) => s.skill.key),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(NotAllowedError)
  })

  it('should not be able to equip skills of an unknown character', async () => {
    const result = await sut.execute({
      characterId: 'ninguem',
      accountId,
      skillKeys: [],
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
