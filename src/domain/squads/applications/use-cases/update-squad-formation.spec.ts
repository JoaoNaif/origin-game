import { beforeEach, describe, expect, it } from 'vitest'
import { seedCatalog } from 'test/repositories/in-memory-catalog-repository'
import { InMemoryCharactersRepository } from 'test/repositories/in-memory-characters-repository'
import { InMemorySquadsRepository } from 'test/repositories/in-memory-squads-repository'
import { makeAccount } from 'test/factories/make-account'
import { makeRoster } from 'test/factories/make-roster'
import { makeSquad } from 'test/factories/make-squad'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Character } from '@/domain/characters/entities/character'
import { Squad } from '../../entities/squad'
import { InvalidSquadError } from '../../errors/invalid-squad-error'
import { UpdateSquadFormationUseCase } from './update-squad-formation'

let charactersRepository: InMemoryCharactersRepository
let squadsRepository: InMemorySquadsRepository
let roster: Character[]
let squad: Squad
let sut: UpdateSquadFormationUseCase

describe('Update Squad Formation', () => {
  beforeEach(async () => {
    const account = makeAccount()
    roster = makeRoster(account, seedCatalog())
    squad = makeSquad({
      account,
      name: 'Muralha',
      members: roster.slice(0, 4).map((character, i) => ({
        character,
        row: i % 3,
        column: Math.floor(i / 3),
      })),
    })

    charactersRepository = new InMemoryCharactersRepository()
    squadsRepository = new InMemorySquadsRepository()
    await charactersRepository.createMany(roster)
    await squadsRepository.create(squad)

    sut = new UpdateSquadFormationUseCase(
      charactersRepository,
      squadsRepository
    )
  })

  it('should be able to swap characters and cells at once', async () => {
    const members = roster.slice(4, 8).map((c, i) => ({
      characterId: c.id.toString(),
      row: i % 3,
      column: 2 - Math.floor(i / 3),
    }))

    const result = await sut.execute({ squadId: squad.id.toString(), members })

    expect(result.isRight()).toBe(true)
    expect(squad.members.map((m) => m.characterId.toString())).toEqual(
      members.map((m) => m.characterId)
    )
  })

  it('should keep the previous formation when the new one is invalid', async () => {
    const before = [...squad.members]

    const result = await sut.execute({
      squadId: squad.id.toString(),
      members: roster.slice(4, 7).map((c, i) => ({
        characterId: c.id.toString(),
        row: i,
        column: 0,
      })),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidSquadError)
    expect(squad.members).toEqual(before)
  })

  it('should not be able to update an unknown squad', async () => {
    const result = await sut.execute({ squadId: 'ninguem', members: [] })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
