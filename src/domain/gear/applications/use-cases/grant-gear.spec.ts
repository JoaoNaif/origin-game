import { beforeEach, describe, expect, it } from 'vitest'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Account } from '@/domain/accounts/entities/account'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { makeAccount } from 'test/factories/make-account'
import { gearTemplateOf, makeGear } from 'test/factories/make-gear'
import { FakeClock } from 'test/gateways/fake-clock'
import { InMemoryAccountsRepository } from 'test/repositories/in-memory-accounts-repository'
import {
  InMemoryCatalogRepository,
  seedCatalog,
} from 'test/repositories/in-memory-catalog-repository'
import { InMemoryGearRepository } from 'test/repositories/in-memory-gear-repository'
import { InMemoryWalletsRepository } from 'test/repositories/in-memory-wallets-repository'
import { InvalidGearError } from '../../errors/invalid-gear-error'
import { GrantGearUseCase } from './grant-gear'

let catalog: GameCatalog
let account: Account
let gearRepository: InMemoryGearRepository
let sut: GrantGearUseCase

describe('Grant Gear', () => {
  beforeEach(async () => {
    catalog = seedCatalog()
    account = makeAccount({ username: 'tester_01' })
    const accountsRepository = new InMemoryAccountsRepository()
    await accountsRepository.create(account)
    gearRepository = new InMemoryGearRepository()
    sut = new GrantGearUseCase(
      accountsRepository,
      gearRepository,
      new InMemoryWalletsRepository(),
      new InMemoryCatalogRepository(catalog),
      new FakeClock()
    )
  })

  it('should be able to give a gear to an account (stored in the inventory)', async () => {
    const result = await sut.execute({
      username: 'tester_01',
      gearKey: 'espada-flamejante',
    })

    expect(result.isRight()).toBe(true)
    expect(gearRepository.items).toHaveLength(1)
    expect(gearRepository.items[0].source).toBe('ADMIN')
    expect(gearRepository.items[0].characterId).toBeNull()
  })

  it('should not be able to give with a full inventory or an unknown key', async () => {
    const template = gearTemplateOf(catalog, 'lamina-de-brasa')
    for (let i = 0; i < 30; i++) {
      await gearRepository.create(makeGear(account, template))
    }

    const full = await sut.execute({
      username: 'tester_01',
      gearKey: 'espada-flamejante',
    })
    const unknown = await sut.execute({
      username: 'tester_01',
      gearKey: 'nao-existe',
    })

    expect(full.value).toBeInstanceOf(InvalidGearError)
    expect(unknown.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
