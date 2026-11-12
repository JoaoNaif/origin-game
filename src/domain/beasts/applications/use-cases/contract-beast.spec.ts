import { beforeEach, describe, expect, it } from 'vitest'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { Account } from '@/domain/accounts/entities/account'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Character } from '@/domain/characters/entities/character'
import { makeAccount } from 'test/factories/make-account'
import { beastTemplateOf, makeBeast } from 'test/factories/make-beast'
import { makeRoster } from 'test/factories/make-roster'
import { InMemoryBeastsRepository } from 'test/repositories/in-memory-beasts-repository'
import {
  InMemoryCatalogRepository,
  seedCatalog,
} from 'test/repositories/in-memory-catalog-repository'
import { InMemoryCharactersRepository } from 'test/repositories/in-memory-characters-repository'
import { InvalidBeastError } from '../../errors/invalid-beast-error'
import { masterRequirements } from '../../services/beast-rules'
import { ContractBeastUseCase } from './contract-beast'

let catalog: GameCatalog
let account: Account
let roster: Character[]
let beastsRepository: InMemoryBeastsRepository
let sut: ContractBeastUseCase

describe('Contract Beast', () => {
  beforeEach(async () => {
    catalog = seedCatalog()
    account = makeAccount()
    roster = makeRoster(account, catalog, 30)
    const charactersRepository = new InMemoryCharactersRepository()
    await charactersRepository.createMany(roster)
    beastsRepository = new InMemoryBeastsRepository()
    sut = new ContractBeastUseCase(
      beastsRepository,
      charactersRepository,
      new InMemoryCatalogRepository(catalog)
    )
  })

  async function stored(key: string) {
    const beast = makeBeast(account, beastTemplateOf(catalog, key))
    await beastsRepository.create(beast)
    return beast
  }

  const request = (beastId: string, character: Character, slot = 4) => ({
    accountId: account.id.toString(),
    beastId,
    characterId: character.id.toString(),
    slot,
  })

  it('should be able to contract a beast with a character, in a build slot', async () => {
    const wolf = await stored('lobo-de-cinzas')

    const result = await sut.execute(request(wolf.id.toString(), roster[0]))

    expect(result.isRight()).toBe(true)
    expect(beastsRepository.items[0].characterId?.equals(roster[0].id)).toBe(
      true
    )
    expect(beastsRepository.items[0].slot).toBe(4)
  })

  it('should not be able to give a character more than 1 beast without Domador', async () => {
    const wolf = await stored('lobo-de-cinzas')
    const snake = await stored('serpente-espelho')
    await sut.execute(request(wolf.id.toString(), roster[0], 4))

    const result = await sut.execute(request(snake.id.toString(), roster[0], 3))

    expect(result.value).toBeInstanceOf(InvalidBeastError)
  })

  it('should not be able to contract a beast twice', async () => {
    const wolf = await stored('lobo-de-cinzas')
    await sut.execute(request(wolf.id.toString(), roster[0]))

    const result = await sut.execute(request(wolf.id.toString(), roster[1]))

    expect(result.value).toBeInstanceOf(InvalidBeastError)
  })

  it('should be able to require every stat requirement on the Mestre contract (no partial)', async () => {
    const falcon = await stored('falcao-de-tempestade')
    const template = beastTemplateOf(catalog, 'falcao-de-tempestade')
    const meets = (c: Character) =>
      masterRequirements(
        template,
        c,
        catalog.templates.get(c.templateId.toValue())!
      ).bond === 'FULL'
    const able = roster.find(meets)
    const unable = roster.find((c) => !meets(c))!

    const refused = await sut.execute(request(falcon.id.toString(), unable))
    expect(refused.value).toBeInstanceOf(InvalidBeastError)

    if (able) {
      const accepted = await sut.execute(request(falcon.id.toString(), able))
      expect(accepted.isRight()).toBe(true)
    }
  })

  it('should not be able to contract the beast of another account', async () => {
    const wolf = await stored('lobo-de-cinzas')

    const result = await sut.execute({
      ...request(wolf.id.toString(), roster[0]),
      accountId: 'outra-conta',
    })

    expect(result.value).toBeInstanceOf(NotAllowedError)
  })
})
