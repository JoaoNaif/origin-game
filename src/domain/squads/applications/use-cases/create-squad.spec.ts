import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAccountsRepository } from 'test/repositories/in-memory-accounts-repository'
import { seedCatalog } from 'test/repositories/in-memory-catalog-repository'
import { InMemoryCharactersRepository } from 'test/repositories/in-memory-characters-repository'
import { InMemorySquadsRepository } from 'test/repositories/in-memory-squads-repository'
import { makeAccount } from 'test/factories/make-account'
import { makeRoster } from 'test/factories/make-roster'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Character } from '@/domain/characters/entities/character'
import { InvalidSquadError } from '../../errors/invalid-squad-error'
import { CreateSquadUseCase } from './create-squad'

let accountsRepository: InMemoryAccountsRepository
let charactersRepository: InMemoryCharactersRepository
let squadsRepository: InMemorySquadsRepository
let roster: Character[]
let accountId: string
let otherRoster: Character[]
let sut: CreateSquadUseCase

const cells = [
  { row: 0, column: 0 },
  { row: 2, column: 0 },
  { row: 1, column: 1 },
  { row: 1, column: 2 },
]

const membersOf = (characters: Character[]) =>
  characters
    .slice(0, 4)
    .map((c, i) => ({ characterId: c.id.toString(), ...cells[i] }))

describe('Create Squad', () => {
  beforeEach(async () => {
    const catalog = seedCatalog()
    const account = makeAccount({ username: 'joao_naif' })
    accountId = account.id.toString()
    const other = makeAccount({ username: 'outra_conta' })
    roster = makeRoster(account, catalog)
    otherRoster = makeRoster(other, catalog)

    accountsRepository = new InMemoryAccountsRepository()
    charactersRepository = new InMemoryCharactersRepository()
    squadsRepository = new InMemorySquadsRepository()
    await accountsRepository.create(account)
    await accountsRepository.create(other)
    await charactersRepository.createMany([...roster, ...otherRoster])

    sut = new CreateSquadUseCase(
      accountsRepository,
      charactersRepository,
      squadsRepository
    )
  })

  it('should be able to create a squad with 4 characters of the account', async () => {
    const result = await sut.execute({
      accountId,
      name: 'Muralha',
      members: membersOf(roster),
    })

    expect(result.isRight()).toBe(true)
    expect(squadsRepository.items).toHaveLength(1)
    expect(squadsRepository.items[0].members).toHaveLength(4)
  })

  it('should not be able to use characters of another account', async () => {
    const result = await sut.execute({
      accountId,
      name: 'Emprestado',
      members: membersOf(otherRoster),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidSquadError)
    expect(squadsRepository.items).toHaveLength(0)
  })

  it('should not be able to put two characters in the same cell', async () => {
    const members = membersOf(roster)
    members[1] = { ...members[1], row: 0, column: 0 }

    const result = await sut.execute({
      accountId,
      name: 'Empilhado',
      members,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidSquadError)
  })

  it('should not be able to use an unknown character', async () => {
    const members = membersOf(roster)
    members[0] = { ...members[0], characterId: 'ninguem' }

    const result = await sut.execute({
      accountId,
      name: 'Fantasma',
      members,
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
