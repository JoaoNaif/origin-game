import { beforeEach, describe, expect, it } from 'vitest'
import { seedCatalog } from 'test/repositories/in-memory-catalog-repository'
import { InMemoryCharactersRepository } from 'test/repositories/in-memory-characters-repository'
import { makeAccount } from 'test/factories/make-account'
import { makeRoster } from 'test/factories/make-roster'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { GetCharacterUseCase } from './get-character'

let charactersRepository: InMemoryCharactersRepository
let sut: GetCharacterUseCase

describe('Get Character', () => {
  beforeEach(() => {
    charactersRepository = new InMemoryCharactersRepository()
    sut = new GetCharacterUseCase(charactersRepository)
  })

  it('should be able to get a character of the account', async () => {
    const account = makeAccount()
    const [character] = makeRoster(account, seedCatalog())
    await charactersRepository.createMany([character])

    const result = await sut.execute({
      characterId: character.id.toString(),
      accountId: account.id.toString(),
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) expect(result.value.character).toBe(character)
  })

  it('should not be able to get a character of another account', async () => {
    const [character] = makeRoster(makeAccount(), seedCatalog())
    await charactersRepository.createMany([character])

    const result = await sut.execute({
      characterId: character.id.toString(),
      accountId: makeAccount({ username: 'outra_conta' }).id.toString(),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(NotAllowedError)
  })

  it('should not be able to get an unknown character', async () => {
    const result = await sut.execute({
      characterId: 'ninguem',
      accountId: 'qualquer',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
