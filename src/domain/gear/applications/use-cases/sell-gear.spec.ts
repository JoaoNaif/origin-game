import { beforeEach, describe, expect, it } from 'vitest'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Account } from '@/domain/accounts/entities/account'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { makeAccount } from 'test/factories/make-account'
import { gearTemplateOf, makeGear } from 'test/factories/make-gear'
import {
  InMemoryCatalogRepository,
  seedCatalog,
} from 'test/repositories/in-memory-catalog-repository'
import { InMemoryGearRepository } from 'test/repositories/in-memory-gear-repository'
import { InMemoryWalletsRepository } from 'test/repositories/in-memory-wallets-repository'
import { InvalidGearError } from '../../errors/invalid-gear-error'
import { SellGearUseCase } from './sell-gear'

let catalog: GameCatalog
let account: Account
let gearRepository: InMemoryGearRepository
let walletsRepository: InMemoryWalletsRepository
let sut: SellGearUseCase

describe('Sell Gear', () => {
  beforeEach(() => {
    catalog = seedCatalog()
    account = makeAccount()
    gearRepository = new InMemoryGearRepository()
    walletsRepository = new InMemoryWalletsRepository()
    sut = new SellGearUseCase(
      gearRepository,
      walletsRepository,
      new InMemoryCatalogRepository(catalog)
    )
  })

  async function stored(key: string) {
    const gear = makeGear(account, gearTemplateOf(catalog, key))
    await gearRepository.create(gear)
    return gear
  }

  it('should be able to sell to the system by the grade value', async () => {
    const gear = await stored('arco-do-vento-cortante')

    const result = await sut.execute({
      accountId: account.id.toString(),
      gearId: gear.id.toString(),
    })

    // Cavaleiro ≈ C: 250 M
    expect(result.isRight() && result.value.coins).toBe(250)
    expect(gearRepository.items).toHaveLength(0)
    const wallet = await walletsRepository.findByAccountId(
      account.id.toString()
    )
    expect(wallet.coins).toBe(250)
    expect(walletsRepository.entries[0].reason).toBe('GEAR_SALE')
  })

  it('should not be able to sell an equipped gear or a Divine one', async () => {
    const equipped = await stored('couraca-de-pedra')
    equipped.equipOn(account.id, new UniqueEntityId('personagem-1'))
    await gearRepository.saveMany([equipped])
    const divine = await stored('relicario-de-alpha')

    const first = await sut.execute({
      accountId: account.id.toString(),
      gearId: equipped.id.toString(),
    })
    const second = await sut.execute({
      accountId: account.id.toString(),
      gearId: divine.id.toString(),
    })

    expect(first.value).toBeInstanceOf(InvalidGearError)
    expect(second.value).toBeInstanceOf(InvalidGearError)
    expect(gearRepository.items).toHaveLength(2)
  })
})
