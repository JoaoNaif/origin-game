import { beforeEach, describe, expect, it } from 'vitest'
import {
  InMemoryCatalogRepository,
  seedCatalog,
} from 'test/repositories/in-memory-catalog-repository'
import { InMemoryCharactersRepository } from 'test/repositories/in-memory-characters-repository'
import { makeAccount } from 'test/factories/make-account'
import { characterOf, makeRoster } from 'test/factories/make-roster'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Character, EMPTY_FREE_POINTS } from '../../entities/character'
import { InvalidCharacterError } from '../../errors/invalid-character-error'
import { AllocateFreePointsUseCase } from './allocate-free-points'

let charactersRepository: InMemoryCharactersRepository
let kael: Character
let accountId: string
let sut: AllocateFreePointsUseCase

describe('Allocate Free Points', () => {
  beforeEach(async () => {
    const catalog = seedCatalog()
    // nível 20: 20 pontos livres
    const account = makeAccount()
    accountId = account.id.toString()
    const roster = makeRoster(account, catalog, 20)
    kael = characterOf(roster, catalog, 'kael-vaz')

    charactersRepository = new InMemoryCharactersRepository()
    await charactersRepository.createMany(roster)
    sut = new AllocateFreePointsUseCase(
      charactersRepository,
      new InMemoryCatalogRepository(catalog)
    )
  })

  it('should be able to allocate the free points of the level', async () => {
    const result = await sut.execute({
      characterId: kael.id.toString(),
      accountId,
      freePoints: { ...EMPTY_FREE_POINTS, DEFENSE: 10, WILL: 10 },
    })

    expect(result.isRight()).toBe(true)
    expect(kael.freePoints).toMatchObject({ DEFENSE: 10, WILL: 10 })
  })

  it('should not be able to use more points than the level gives', async () => {
    const result = await sut.execute({
      characterId: kael.id.toString(),
      accountId,
      freePoints: { ...EMPTY_FREE_POINTS, DEFENSE: 15, WILL: 10 },
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidCharacterError)
    expect(kael.freePoints).toEqual(EMPTY_FREE_POINTS)
  })

  it('should not be able to allocate points of another account', async () => {
    const result = await sut.execute({
      characterId: kael.id.toString(),
      accountId: 'outra-conta',
      freePoints: EMPTY_FREE_POINTS,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(NotAllowedError)
  })

  it('should not be able to allocate points of an unknown character', async () => {
    const result = await sut.execute({
      characterId: 'ninguem',
      accountId,
      freePoints: EMPTY_FREE_POINTS,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
