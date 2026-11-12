import { beforeEach, describe, expect, it } from 'vitest'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Account } from '@/domain/accounts/entities/account'
import { makeAccount } from 'test/factories/make-account'
import { makeRoster } from 'test/factories/make-roster'
import { FakeClock } from 'test/gateways/fake-clock'
import { FakeSeedGenerator } from 'test/gateways/fake-seed-generator'
import { InMemoryAccountsRepository } from 'test/repositories/in-memory-accounts-repository'
import {
  InMemoryCatalogRepository,
  seedCatalog,
} from 'test/repositories/in-memory-catalog-repository'
import { InMemoryCharactersRepository } from 'test/repositories/in-memory-characters-repository'
import { Gear } from '@/domain/gear/entities/gear'
import { gearSaleValue } from '@/domain/gear/gear-values'
import { InMemoryBeastsRepository } from 'test/repositories/in-memory-beasts-repository'
import { InMemoryGearRepository } from 'test/repositories/in-memory-gear-repository'
import { InMemoryChestsRepository } from 'test/repositories/in-memory-chests-repository'
import { InMemoryWalletsRepository } from 'test/repositories/in-memory-wallets-repository'
import { InsufficientFundsError } from '../../errors/insufficient-funds-error'
import { InvalidEconomyActionError } from '../../errors/invalid-economy-action-error'
import { totalFragments } from '../../value-objects/fragments'
import { BuyChestUseCase } from './buy-chest'
import { FetchAccountChestsUseCase } from './fetch-account-chests'
import { OpenChestUseCase } from './open-chest'

let catalog: GameCatalog
let account: Account
let accountId: string
let walletsRepository: InMemoryWalletsRepository
let chestsRepository: InMemoryChestsRepository
let charactersRepository: InMemoryCharactersRepository
let gearRepository: InMemoryGearRepository
let buyChest: BuyChestUseCase
let sut: OpenChestUseCase

describe('Open Chest', () => {
  beforeEach(async () => {
    catalog = seedCatalog()
    account = makeAccount()
    accountId = account.id.toString()
    walletsRepository = new InMemoryWalletsRepository()
    chestsRepository = new InMemoryChestsRepository()
    charactersRepository = new InMemoryCharactersRepository()
    gearRepository = new InMemoryGearRepository()
    const accountsRepository = new InMemoryAccountsRepository()
    await accountsRepository.create(account)
    await charactersRepository.createMany(makeRoster(account, catalog))

    buyChest = new BuyChestUseCase(
      walletsRepository,
      chestsRepository,
      new FakeClock()
    )
    sut = new OpenChestUseCase(
      chestsRepository,
      walletsRepository,
      charactersRepository,
      accountsRepository,
      new InMemoryCatalogRepository(catalog),
      gearRepository,
      new InMemoryBeastsRepository(),
      new FakeSeedGenerator(),
      new FakeClock()
    )
  })

  async function boughtChest(tier: 'E' | 'D' | 'C' = 'E') {
    await walletsRepository.give(accountId, 3500)
    const bought = await buyChest.execute({ accountId, tier })
    if (bought.isLeft()) throw bought.value

    return bought.value.chest
  }

  it('should be able to buy a chest, which arrives closed', async () => {
    const chest = await boughtChest('D')

    expect(chest).toMatchObject({ tier: 'D', source: 'PURCHASE' })
    const wallet = await walletsRepository.findByAccountId(accountId)
    expect(wallet.coins).toBe(2500)
    const closed = await new FetchAccountChestsUseCase(
      chestsRepository
    ).execute({ accountId })
    expect(closed.value.chests.map((c) => c.id)).toEqual([chest.id])
  })

  it('should not be able to buy a chest that is not sold or without coins', async () => {
    const notSold = await buyChest.execute({ accountId, tier: 'B' })
    const poor = await buyChest.execute({ accountId, tier: 'E' })

    expect(notSold.value).toBeInstanceOf(InvalidEconomyActionError)
    expect(poor.value).toBeInstanceOf(InsufficientFundsError)
    expect(chestsRepository.items).toHaveLength(0)
  })

  it('should be able to open a chest: one item and the chest fragments', async () => {
    const chest = await boughtChest('E')

    const result = await sut.execute({
      chestId: chest.id.toString(),
      accountId,
    })

    expect(result.isRight()).toBe(true)
    if (result.isLeft()) return
    const { contents } = result.value.chest
    expect(totalFragments(contents!.fragments)).toBe(1)

    const wallet = await walletsRepository.findByAccountId(accountId)
    expect(wallet.coins).toBe(3500 - 300 + contents!.coins)
    if (result.value.character) {
      // personagem novo no Elenco, como no cadastro
      expect(charactersRepository.items).toHaveLength(13)
      expect(result.value.character.level).toBe(0)
      expect(contents!.coins).toBe(0)
    } else if (result.value.gear) {
      // equipamento novo no inventário (D153)
      expect(gearRepository.items).toHaveLength(1)
      expect(contents!.gear?.gearId).toBe(result.value.gear.id.toString())
      expect(contents!.coins).toBe(0)
    } else {
      expect(contents!.coins).toBeGreaterThan(0)
    }
    expect(chestsRepository.items[0].isOpened).toBe(true)
  })

  it('should be able to get the chest characters after opening many chests', async () => {
    const keys = new Set<string>()
    for (let i = 0; i < 40; i++) {
      const chest = await boughtChest('E')
      const result = await sut.execute({
        chestId: chest.id.toString(),
        accountId,
      })
      if (result.isLeft()) throw result.value
      const got = result.value.chest.contents!.character?.templateKey
      if (got) {
        // um por modelo: o segundo vira moeda
        expect(keys.has(got)).toBe(false)
        keys.add(got)
      }
    }

    expect(keys.size).toBeGreaterThan(0)
    expect(charactersRepository.items).toHaveLength(12 + keys.size)
  })

  it('should be able to get gear from chests, and coins when the inventory is full', async () => {
    let gotGear = false
    for (let i = 0; i < 40 && !gotGear; i++) {
      const chest = await boughtChest('E')
      const result = await sut.execute({
        chestId: chest.id.toString(),
        accountId,
      })
      if (result.isLeft()) throw result.value
      gotGear = result.value.gear !== null
    }
    expect(gotGear).toBe(true)
    expect(gearRepository.items[0].source).toBe('CHEST')

    // inventário cheio: o equipamento que sair vira moeda pelo valor de venda
    const slots = (await walletsRepository.findByAccountId(accountId))
      .inventorySlots
    while (gearRepository.items.length < slots) {
      await gearRepository.create(
        Gear.create({
          accountId: account.id,
          templateId: gearRepository.items[0].templateId,
          source: 'ADMIN',
          acquiredAt: new Date(),
        })
      )
    }
    let converted = false
    for (let i = 0; i < 60 && !converted; i++) {
      const chest = await boughtChest('E')
      const result = await sut.execute({
        chestId: chest.id.toString(),
        accountId,
      })
      if (result.isLeft()) throw result.value
      expect(result.value.gear).toBeNull()
      converted = result.value.chest.contents!.convertedGearKey != null
      if (converted) {
        const key = result.value.chest.contents!.convertedGearKey
        const template = [...catalog.gearTemplates.values()].find(
          (g) => g.key === key
        )!
        expect(result.value.chest.contents!.coins).toBe(
          gearSaleValue(template.grade)
        )
      }
    }
    expect(converted).toBe(true)
    expect(gearRepository.items).toHaveLength(slots)
  })

  it('should not be able to open the same chest twice', async () => {
    const chest = await boughtChest()
    await sut.execute({ chestId: chest.id.toString(), accountId })

    const again = await sut.execute({ chestId: chest.id.toString(), accountId })

    expect(again.value).toBeInstanceOf(InvalidEconomyActionError)
  })

  it('should not be able to open the chest of another account', async () => {
    const chest = await boughtChest()

    const result = await sut.execute({
      chestId: chest.id.toString(),
      accountId: 'outra-conta',
    })

    expect(result.value).toBeInstanceOf(NotAllowedError)
  })
})
