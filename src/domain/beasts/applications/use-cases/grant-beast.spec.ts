import { beforeEach, describe, expect, it } from 'vitest'
import { Account } from '@/domain/accounts/entities/account'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { makeAccount } from 'test/factories/make-account'
import { gearTemplateOf, makeGear } from 'test/factories/make-gear'
import { FakeClock } from 'test/gateways/fake-clock'
import { InMemoryAccountsRepository } from 'test/repositories/in-memory-accounts-repository'
import { InMemoryBeastsRepository } from 'test/repositories/in-memory-beasts-repository'
import {
  InMemoryCatalogRepository,
  seedCatalog,
} from 'test/repositories/in-memory-catalog-repository'
import { InMemoryGearRepository } from 'test/repositories/in-memory-gear-repository'
import { InMemoryWalletsRepository } from 'test/repositories/in-memory-wallets-repository'
import { InvalidBeastError } from '../../errors/invalid-beast-error'
import { GrantBeastUseCase } from './grant-beast'

let catalog: GameCatalog
let account: Account
let beastsRepository: InMemoryBeastsRepository
let gearRepository: InMemoryGearRepository
let sut: GrantBeastUseCase

describe('Grant Beast', () => {
  beforeEach(async () => {
    catalog = seedCatalog()
    account = makeAccount({ username: 'tester_01' })
    const accountsRepository = new InMemoryAccountsRepository()
    await accountsRepository.create(account)
    beastsRepository = new InMemoryBeastsRepository()
    gearRepository = new InMemoryGearRepository()
    sut = new GrantBeastUseCase(
      accountsRepository,
      beastsRepository,
      gearRepository,
      new InMemoryWalletsRepository(),
      new InMemoryCatalogRepository(catalog),
      new FakeClock()
    )
  })

  it('should be able to give a beast without contract', async () => {
    const result = await sut.execute({
      username: 'tester_01',
      beastKey: 'fenix',
    })

    expect(result.isRight()).toBe(true)
    expect(beastsRepository.items[0].hasContract).toBe(false)
  })

  it('should not be able to give a beast when gear fills the inventory', async () => {
    const template = gearTemplateOf(catalog, 'lamina-de-brasa')
    for (let i = 0; i < 30; i++) {
      await gearRepository.create(makeGear(account, template))
    }

    const result = await sut.execute({
      username: 'tester_01',
      beastKey: 'fenix',
    })

    expect(result.value).toBeInstanceOf(InvalidBeastError)
  })
})
