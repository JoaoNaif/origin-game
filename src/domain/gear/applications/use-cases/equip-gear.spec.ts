import { beforeEach, describe, expect, it } from 'vitest'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { Account } from '@/domain/accounts/entities/account'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Character } from '@/domain/characters/entities/character'
import { makeAccount } from 'test/factories/make-account'
import { gearTemplateOf, makeGear } from 'test/factories/make-gear'
import { makeRoster } from 'test/factories/make-roster'
import { seedCatalog } from 'test/repositories/in-memory-catalog-repository'
import { InMemoryCharactersRepository } from 'test/repositories/in-memory-characters-repository'
import { InMemoryGearRepository } from 'test/repositories/in-memory-gear-repository'
import { EquipGearUseCase } from './equip-gear'

let catalog: GameCatalog
let account: Account
let roster: Character[]
let gearRepository: InMemoryGearRepository
let sut: EquipGearUseCase

describe('Equip Gear', () => {
  beforeEach(async () => {
    catalog = seedCatalog()
    account = makeAccount()
    roster = makeRoster(account, catalog)
    const charactersRepository = new InMemoryCharactersRepository()
    await charactersRepository.createMany(roster)
    gearRepository = new InMemoryGearRepository()
    sut = new EquipGearUseCase(gearRepository, charactersRepository)
  })

  async function stored(key: string) {
    const gear = makeGear(account, gearTemplateOf(catalog, key))
    await gearRepository.create(gear)
    return gear
  }

  it('should be able to put the gear in the character slot', async () => {
    const gear = await stored('couraca-de-pedra')

    const result = await sut.execute({
      accountId: account.id.toString(),
      gearId: gear.id.toString(),
      characterId: roster[0].id.toString(),
    })

    expect(result.isRight()).toBe(true)
    expect(gearRepository.items[0].characterId?.equals(roster[0].id)).toBe(true)
  })

  it('should be able to swap: what was in the slot goes back to the inventory', async () => {
    const first = await stored('couraca-de-pedra')
    const second = await stored('lamina-de-brasa')
    const accountId = account.id.toString()
    const characterId = roster[0].id.toString()
    await sut.execute({ accountId, gearId: first.id.toString(), characterId })

    const result = await sut.execute({
      accountId,
      gearId: second.id.toString(),
      characterId,
    })

    expect(result.isRight() && result.value.unequipped?.id).toEqual(first.id)
    const [a, b] = gearRepository.items
    expect(a.characterId).toBeNull()
    expect(b.characterId?.equals(roster[0].id)).toBe(true)
  })

  it('should be able to move the gear from one character to another', async () => {
    const gear = await stored('couraca-de-pedra')
    const accountId = account.id.toString()
    await sut.execute({
      accountId,
      gearId: gear.id.toString(),
      characterId: roster[0].id.toString(),
    })

    await sut.execute({
      accountId,
      gearId: gear.id.toString(),
      characterId: roster[1].id.toString(),
    })

    expect(gearRepository.items[0].characterId?.equals(roster[1].id)).toBe(true)
  })

  it('should not be able to equip the gear of another account', async () => {
    const gear = await stored('couraca-de-pedra')

    const result = await sut.execute({
      accountId: 'outra-conta',
      gearId: gear.id.toString(),
      characterId: roster[0].id.toString(),
    })

    expect(result.value).toBeInstanceOf(NotAllowedError)
  })
})
