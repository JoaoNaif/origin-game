import { beforeEach, describe, expect, it } from 'vitest'
import { Account } from '@/domain/accounts/entities/account'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { makeAccount } from 'test/factories/make-account'
import { gearTemplateOf, makeGear } from 'test/factories/make-gear'
import { makeRoster } from 'test/factories/make-roster'
import {
  InMemoryCatalogRepository,
  seedCatalog,
} from 'test/repositories/in-memory-catalog-repository'
import { InMemoryCharactersRepository } from 'test/repositories/in-memory-characters-repository'
import { InMemoryGearRepository } from 'test/repositories/in-memory-gear-repository'
import { FetchGearBondsUseCase } from './fetch-gear-bonds'

let catalog: GameCatalog
let account: Account
let gearRepository: InMemoryGearRepository
let sut: FetchGearBondsUseCase

describe('Fetch Gear Bonds', () => {
  beforeEach(async () => {
    catalog = seedCatalog()
    account = makeAccount()
    const charactersRepository = new InMemoryCharactersRepository()
    await charactersRepository.createMany(makeRoster(account, catalog, 30))
    gearRepository = new InMemoryGearRepository()
    sut = new FetchGearBondsUseCase(
      gearRepository,
      charactersRepository,
      new InMemoryCatalogRepository(catalog)
    )
  })

  it('should be able to list the bond with every character of the account', async () => {
    const gear = makeGear(account, gearTemplateOf(catalog, 'couraca-de-pedra'))
    await gearRepository.create(gear)

    const result = await sut.execute({
      accountId: account.id.toString(),
      gearId: gear.id.toString(),
    })

    expect(result.isRight()).toBe(true)
    if (result.isLeft()) return
    expect(result.value.bonds).toHaveLength(12)
    // Defesa e HP altos: os tanques do elenco têm elo pleno, e nem todos têm
    const bonds = result.value.bonds.map((b) => b.bond.bond)
    expect(bonds).toContain('FULL')
    expect(new Set(bonds).size).toBeGreaterThan(1)
  })
})
