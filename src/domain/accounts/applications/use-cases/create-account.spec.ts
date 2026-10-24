import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryAccountsRepository } from 'test/repositories/in-memory-accounts-repository'
import { InMemoryCatalogRepository } from 'test/repositories/in-memory-catalog-repository'
import { InMemoryCharactersRepository } from 'test/repositories/in-memory-characters-repository'
import { makeAccount } from 'test/factories/make-account'
import { ResourceAlreadyExistsError } from '@/core/errors/err/resource-already-exists-error'
import { InvalidAccountError } from '../../errors/invalid-account-error'
import { CreateAccountUseCase } from './create-account'

let accountsRepository: InMemoryAccountsRepository
let charactersRepository: InMemoryCharactersRepository
let catalogRepository: InMemoryCatalogRepository
let sut: CreateAccountUseCase

describe('Create Account', () => {
  beforeEach(() => {
    accountsRepository = new InMemoryAccountsRepository()
    charactersRepository = new InMemoryCharactersRepository()
    catalogRepository = new InMemoryCatalogRepository()
    sut = new CreateAccountUseCase(
      accountsRepository,
      charactersRepository,
      catalogRepository
    )
  })

  it('should be able to create an account', async () => {
    const result = await sut.execute({
      username: 'joao_naif',
      displayName: 'João',
    })

    expect(result.isRight()).toBe(true)
    expect(accountsRepository.items).toHaveLength(1)
    if (result.isRight()) {
      expect(result.value.account).toBe(accountsRepository.items[0])
      expect(result.value.account.displayName).toBe('João')
    }
  })

  it('should be able to start the account with one character of each template', async () => {
    const result = await sut.execute({
      username: 'joao_naif',
      displayName: 'João',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      const account = result.value.account
      const templateIds = charactersRepository.items.map((c) =>
        c.templateId.toValue()
      )

      expect(charactersRepository.items).toHaveLength(12)
      expect(new Set(templateIds).size).toBe(12)
      expect(
        charactersRepository.items.every(
          (c) =>
            c.accountId.equals(account.id) &&
            c.level === 0 &&
            c.build.length === 4
        )
      ).toBe(true)
    }
  })

  it('should be able to copy the family trait of the template', async () => {
    await sut.execute({ username: 'joao_naif', displayName: 'João' })

    const catalog = await catalogRepository.load()
    const ecko = [...catalog.templates.values()].find(
      (t) => t.key === 'ecko-nocthar'
    )!
    const character = charactersRepository.items.find((c) =>
      c.templateId.equals(ecko.id)
    )!

    expect(character.traits.map((t) => t.id.toValue())).toEqual([
      ecko.familyTraitId!.toValue(),
    ])
  })

  it('should be able to save the username normalized', async () => {
    await sut.execute({ username: '  Tester_01 ', displayName: 'Tester' })

    expect(accountsRepository.items[0].username).toBe('tester_01')
  })

  it('should not be able to create an account with an invalid username', async () => {
    const result = await sut.execute({
      username: 'Joao Naif!',
      displayName: 'João',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidAccountError)
    expect(accountsRepository.items).toHaveLength(0)
    expect(charactersRepository.items).toHaveLength(0)
  })

  it('should not be able to reuse a username with other casing', async () => {
    await accountsRepository.create(makeAccount({ username: 'tester_01' }))

    const result = await sut.execute({
      username: 'TESTER_01',
      displayName: 'Outro',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceAlreadyExistsError)
    expect(accountsRepository.items).toHaveLength(1)
    expect(charactersRepository.items).toHaveLength(0)
  })
})
