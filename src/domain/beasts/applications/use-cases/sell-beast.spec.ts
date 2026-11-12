import { beforeEach, describe, expect, it } from 'vitest'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Account } from '@/domain/accounts/entities/account'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { makeAccount } from 'test/factories/make-account'
import { beastTemplateOf, makeBeast } from 'test/factories/make-beast'
import { InMemoryBeastsRepository } from 'test/repositories/in-memory-beasts-repository'
import {
  InMemoryCatalogRepository,
  seedCatalog,
} from 'test/repositories/in-memory-catalog-repository'
import { InMemoryWalletsRepository } from 'test/repositories/in-memory-wallets-repository'
import { InvalidBeastError } from '../../errors/invalid-beast-error'
import { ReleaseBeastUseCase } from './release-beast'
import { SellBeastUseCase } from './sell-beast'

let catalog: GameCatalog
let account: Account
let beastsRepository: InMemoryBeastsRepository
let walletsRepository: InMemoryWalletsRepository
let sut: SellBeastUseCase

describe('Sell and Release Beast', () => {
  beforeEach(() => {
    catalog = seedCatalog()
    account = makeAccount()
    beastsRepository = new InMemoryBeastsRepository()
    walletsRepository = new InMemoryWalletsRepository()
    sut = new SellBeastUseCase(
      beastsRepository,
      walletsRepository,
      new InMemoryCatalogRepository(catalog)
    )
  })

  async function stored(key: string) {
    const beast = makeBeast(account, beastTemplateOf(catalog, key))
    await beastsRepository.create(beast)
    return beast
  }

  it('should be able to sell a beast without contract by the grade value', async () => {
    const wolf = await stored('lobo-de-cinzas')

    const result = await sut.execute({
      accountId: account.id.toString(),
      beastId: wolf.id.toString(),
    })

    // Cavaleiro ≈ C: 250 M
    expect(result.isRight() && result.value.coins).toBe(250)
    expect(beastsRepository.items).toHaveLength(0)
    expect(walletsRepository.entries[0].reason).toBe('BEAST_SALE')
  })

  it('should not be able to sell a contracted or a sacred beast', async () => {
    const wolf = await stored('lobo-de-cinzas')
    wolf.contractWith(account.id, new UniqueEntityId('personagem-1'), 4)
    await beastsRepository.save(wolf)
    const phoenix = await stored('fenix')

    const contracted = await sut.execute({
      accountId: account.id.toString(),
      beastId: wolf.id.toString(),
    })
    const sacred = await sut.execute({
      accountId: account.id.toString(),
      beastId: phoenix.id.toString(),
    })

    expect(contracted.value).toBeInstanceOf(InvalidBeastError)
    expect(sacred.value).toBeInstanceOf(InvalidBeastError)
  })

  it('should be able to lose the beast when the contract is undone (no coins)', async () => {
    const wolf = await stored('lobo-de-cinzas')
    wolf.contractWith(account.id, new UniqueEntityId('personagem-1'), 4)
    await beastsRepository.save(wolf)

    const result = await new ReleaseBeastUseCase(beastsRepository).execute({
      accountId: account.id.toString(),
      beastId: wolf.id.toString(),
    })

    expect(result.isRight()).toBe(true)
    expect(beastsRepository.items).toHaveLength(0)
    expect(walletsRepository.entries).toHaveLength(0)
  })
})
