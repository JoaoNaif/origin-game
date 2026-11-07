import { beforeEach, describe, expect, it } from 'vitest'
import { InMemoryWalletsRepository } from 'test/repositories/in-memory-wallets-repository'
import { InsufficientFundsError } from '../../errors/insufficient-funds-error'
import { InvalidEconomyActionError } from '../../errors/invalid-economy-action-error'
import { BuyFragmentsUseCase } from './buy-fragments'
import { SellFragmentsUseCase } from './sell-fragments'

let walletsRepository: InMemoryWalletsRepository
let sut: BuyFragmentsUseCase

describe('Buy Fragments', () => {
  beforeEach(() => {
    walletsRepository = new InMemoryWalletsRepository()
    sut = new BuyFragmentsUseCase(walletsRepository)
  })

  it('should be able to buy fragments for 200 coins each', async () => {
    await walletsRepository.give('conta-1', 1000)

    const result = await sut.execute({
      accountId: 'conta-1',
      type: 'BIOLOGICAL',
      amount: 3,
    })

    expect(result.isRight()).toBe(true)
    const wallet = await walletsRepository.findByAccountId('conta-1')
    expect(wallet.coins).toBe(400)
    expect(wallet.fragmentsOf('BIOLOGICAL')).toBe(3)
  })

  it('should not be able to buy without coins or over the 500 cap', async () => {
    await walletsRepository.give('conta-1', 1000, { BIOLOGICAL: 499 })

    const poor = await sut.execute({
      accountId: 'conta-1',
      type: 'ELEMENTAL',
      amount: 6,
    })
    const full = await sut.execute({
      accountId: 'conta-1',
      type: 'BIOLOGICAL',
      amount: 2,
    })
    const zero = await sut.execute({
      accountId: 'conta-1',
      type: 'BIOLOGICAL',
      amount: 0,
    })

    expect(poor.value).toBeInstanceOf(InsufficientFundsError)
    expect(full.value).toBeInstanceOf(InvalidEconomyActionError)
    expect(zero.value).toBeInstanceOf(InvalidEconomyActionError)
    expect((await walletsRepository.findByAccountId('conta-1')).coins).toBe(
      1000
    )
  })
})

describe('Sell Fragments', () => {
  beforeEach(() => {
    walletsRepository = new InMemoryWalletsRepository()
  })

  it('should be able to sell fragments for 40 coins each', async () => {
    await walletsRepository.give('conta-1', 0, { NONE: 10 })

    const result = await new SellFragmentsUseCase(walletsRepository).execute({
      accountId: 'conta-1',
      type: 'NONE',
      amount: 4,
    })

    expect(result.isRight()).toBe(true)
    const wallet = await walletsRepository.findByAccountId('conta-1')
    expect(wallet.coins).toBe(160)
    expect(wallet.fragmentsOf('NONE')).toBe(6)
  })

  it('should not be able to sell fragments it does not have', async () => {
    const result = await new SellFragmentsUseCase(walletsRepository).execute({
      accountId: 'conta-1',
      type: 'NONE',
      amount: 1,
    })

    expect(result.value).toBeInstanceOf(InsufficientFundsError)
  })
})
