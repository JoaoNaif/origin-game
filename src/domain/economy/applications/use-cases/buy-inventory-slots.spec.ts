import { beforeEach, describe, expect, it } from 'vitest'
import { inventoryExpansionPrice } from '../../economy-values'
import { InsufficientFundsError } from '../../errors/insufficient-funds-error'
import { InvalidEconomyActionError } from '../../errors/invalid-economy-action-error'
import { InMemoryWalletsRepository } from 'test/repositories/in-memory-wallets-repository'
import { BuyInventorySlotsUseCase } from './buy-inventory-slots'

let walletsRepository: InMemoryWalletsRepository
let sut: BuyInventorySlotsUseCase

describe('Buy Inventory Slots', () => {
  beforeEach(() => {
    walletsRepository = new InMemoryWalletsRepository()
    sut = new BuyInventorySlotsUseCase(walletsRepository)
  })

  it('should be able to price the purchases: 300, 600, 1.000, 1.500, 2.000 and +500 after', () => {
    expect(
      [30, 35, 40, 45, 50, 55, 60, 95].map(inventoryExpansionPrice)
    ).toEqual([300, 600, 1_000, 1_500, 2_000, 2_500, 3_000, 6_500])
    expect(inventoryExpansionPrice(100)).toBeNull()
  })

  it('should be able to buy +5 slots with coins', async () => {
    await walletsRepository.give('conta-1', 1_000)

    const result = await sut.execute({ accountId: 'conta-1' })

    expect(result.isRight()).toBe(true)
    const wallet = await walletsRepository.findByAccountId('conta-1')
    expect(wallet.inventorySlots).toBe(35)
    expect(wallet.coins).toBe(700)
    expect(wallet.nextInventoryExpansionPrice).toBe(600)
  })

  it('should not be able to buy without coins or past 100 slots', async () => {
    const broke = await sut.execute({ accountId: 'conta-1' })
    expect(broke.value).toBeInstanceOf(InsufficientFundsError)

    await walletsRepository.give('conta-2', 100_000)
    for (let i = 0; i < 14; i++) await sut.execute({ accountId: 'conta-2' })
    const capped = await sut.execute({ accountId: 'conta-2' })

    expect(capped.value).toBeInstanceOf(InvalidEconomyActionError)
    const wallet = await walletsRepository.findByAccountId('conta-2')
    expect(wallet.inventorySlots).toBe(100)
  })
})
