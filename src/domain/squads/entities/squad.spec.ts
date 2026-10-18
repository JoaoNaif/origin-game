import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Account } from '@/domain/accounts/entities/account'
import { Character } from '@/domain/characters/entities/character'
import { makeAccount } from 'test/factories/make-account'
import { makeBasicKit } from 'test/factories/make-basic-kit'
import { makeCharacterTemplate } from 'test/factories/make-character-template'
import { beforeEach, describe, expect, it } from 'vitest'
import { InvalidSquadError } from '../errors/invalid-squad-error'
import { Squad, SquadMemberInput } from './squad'

describe('Squad', () => {
  let account: Account
  let characters: Character[]

  const makeCharacter = (owner: Account, index: number) => {
    const template = makeCharacterTemplate(
      { key: `recruit-${index}` },
      new UniqueEntityId(`template-${index}`)
    )
    const created = Character.create({
      account: owner,
      template,
      kitSkills: makeBasicKit(template),
    })
    if (created.isLeft()) throw created.value

    return created.value
  }

  // formação padrão: 2 na frente (coluna 0), 2 atrás (coluna 1)
  const formation = (list: Character[]): SquadMemberInput[] => [
    { character: list[0], row: 0, column: 0 },
    { character: list[1], row: 2, column: 0 },
    { character: list[2], row: 1, column: 1 },
    { character: list[3], row: 1, column: 2 },
  ]

  beforeEach(() => {
    account = makeAccount()
    characters = [0, 1, 2, 3].map((i) => makeCharacter(account, i))
  })

  describe('Create Squad', () => {
    it('should be able to create a squad with 4 characters on the grid', () => {
      const sut = Squad.create({
        account,
        name: '  Muralha ',
        members: formation(characters),
      })

      expect(sut.isRight()).toBe(true)
      if (sut.isRight()) {
        expect(sut.value.name).toBe('Muralha')
        expect(sut.value.members).toHaveLength(4)
        expect(sut.value.members[0]).toMatchObject({ row: 0, column: 0 })
      }
    })

    it('should not be able to create a squad with 3 characters', () => {
      const sut = Squad.create({
        account,
        name: 'Incompleto',
        members: formation(characters).slice(0, 3),
      })

      expect(sut.isLeft()).toBe(true)
      expect(sut.value).toBeInstanceOf(InvalidSquadError)
    })

    it('should not be able to use a character from another account', () => {
      const other = makeAccount({ username: 'other_01' })
      const stranger = makeCharacter(other, 9)

      const sut = Squad.create({
        account,
        name: 'Misturado',
        members: formation([...characters.slice(0, 3), stranger]),
      })

      expect(sut.isLeft()).toBe(true)
    })

    it('should not be able to repeat a character', () => {
      const sut = Squad.create({
        account,
        name: 'Clone',
        members: formation([
          characters[0],
          characters[0],
          characters[1],
          characters[2],
        ]),
      })

      expect(sut.isLeft()).toBe(true)
    })

    it('should not be able to put two characters on the same cell', () => {
      const members = formation(characters)
      members[1] = { ...members[1], row: 0, column: 0 }

      const sut = Squad.create({ account, name: 'Empilhado', members })

      expect(sut.isLeft()).toBe(true)
    })

    it('should not be able to place a character outside the grid', () => {
      const members = formation(characters)
      members[3] = { ...members[3], column: 3 }

      const sut = Squad.create({ account, name: 'Fora', members })

      expect(sut.isLeft()).toBe(true)
    })

    it('should not be able to create a squad without a name', () => {
      const sut = Squad.create({
        account,
        name: '   ',
        members: formation(characters),
      })

      expect(sut.isLeft()).toBe(true)
    })
  })

  describe('Set Formation', () => {
    let sut: Squad

    beforeEach(() => {
      const created = Squad.create({
        account,
        name: 'Muralha',
        members: formation(characters),
      })
      if (created.isLeft()) throw created.value
      sut = created.value
    })

    it('should be able to move the characters to other cells', () => {
      const result = sut.setFormation([
        { character: characters[0], row: 0, column: 0 },
        { character: characters[1], row: 1, column: 0 },
        { character: characters[2], row: 2, column: 0 },
        { character: characters[3], row: 1, column: 2 },
      ])

      expect(result.isRight()).toBe(true)
      expect(sut.members[1]).toMatchObject({ row: 1, column: 0 })
    })

    it('should keep the previous formation when the new one is invalid', () => {
      const result = sut.setFormation(formation(characters).slice(0, 2))

      expect(result.isLeft()).toBe(true)
      expect(sut.members).toHaveLength(4)
    })
  })
})
