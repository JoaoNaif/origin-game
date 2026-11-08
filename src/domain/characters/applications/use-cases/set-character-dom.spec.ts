import { beforeEach, describe, expect, it } from 'vitest'
import { seedCatalog } from 'test/repositories/in-memory-catalog-repository'
import { InMemoryCharactersRepository } from 'test/repositories/in-memory-characters-repository'
import { makeAccount } from 'test/factories/make-account'
import { makeRoster } from 'test/factories/make-roster'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { DomLevel } from '../../enums/dom-level'
import { InvalidCharacterError } from '../../errors/invalid-character-error'
import { SetCharacterDomUseCase } from './set-character-dom'

let charactersRepository: InMemoryCharactersRepository
let sut: SetCharacterDomUseCase

describe('Set Character Dom', () => {
  beforeEach(() => {
    charactersRepository = new InMemoryCharactersRepository()
    sut = new SetCharacterDomUseCase(charactersRepository)
  })

  it('should be able to set the levels of the pillars', async () => {
    const [character] = makeRoster(makeAccount(), seedCatalog())
    await charactersRepository.createMany([character])

    const result = await sut.execute({
      characterId: character.id.toString(),
      pillars: { BODY: DomLevel.ADVANCED, MIND: DomLevel.BASIC },
    })

    expect(result.isRight()).toBe(true)
    const saved = await charactersRepository.findById(character.id.toString())
    expect(saved!.domPillars).toEqual({ BODY: 'ADVANCED', MIND: 'BASIC' })
  })

  it('should not be able to set an unknown pillar', async () => {
    const [character] = makeRoster(makeAccount(), seedCatalog())
    await charactersRepository.createMany([character])

    const result = await sut.execute({
      characterId: character.id.toString(),
      pillars: { SOUL: DomLevel.BASIC } as never,
    })

    expect(result.value).toBeInstanceOf(InvalidCharacterError)
  })

  it('should not be able to set the DOM of an unknown character', async () => {
    const result = await sut.execute({ characterId: 'ninguem', pillars: {} })

    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
