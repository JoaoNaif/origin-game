import { beforeEach, describe, expect, it } from 'vitest'
import { SeededRng } from '@/core/rng/seeded-rng'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { makeAccount } from 'test/factories/make-account'
import { characterOf, makeRoster } from 'test/factories/make-roster'
import { FakeClock } from 'test/gateways/fake-clock'
import {
  InMemoryCatalogRepository,
  seedCatalog,
} from 'test/repositories/in-memory-catalog-repository'
import { InMemoryCharactersRepository } from 'test/repositories/in-memory-characters-repository'
import { InMemorySkillOffersRepository } from 'test/repositories/in-memory-skill-offers-repository'
import { Character } from '../../entities/character'
import { SkillOffer } from '../../entities/skill-offer'
import { InvalidSkillOfferError } from '../../errors/invalid-skill-offer-error'
import { xpToNextLevel } from '../../services/level-curve'
import { skillOffersOnLevelUp } from '../services/skill-offers-on-level-up'
import { ChooseSkillOfferUseCase } from './choose-skill-offer'
import { FetchPendingSkillOffersUseCase } from './fetch-pending-skill-offers'

let charactersRepository: InMemoryCharactersRepository
let skillOffersRepository: InMemorySkillOffersRepository
let kael: Character
let accountId: string
let offer: SkillOffer
let catalog: GameCatalog
let sut: ChooseSkillOfferUseCase

describe('Choose Skill Offer', () => {
  beforeEach(async () => {
    catalog = seedCatalog()
    const account = makeAccount()
    accountId = account.id.toString()
    const roster = makeRoster(account, catalog)
    kael = characterOf(roster, catalog, 'kael-vaz')
    while (kael.level < 20) kael.gainXp(xpToNextLevel(kael.level))
    ;[offer] = skillOffersOnLevelUp({
      character: kael,
      fromLevel: 19,
      catalog,
      pending: [],
      rng: new SeededRng(1),
      now: new Date('2026-10-24T12:00:00.000Z'),
    })

    charactersRepository = new InMemoryCharactersRepository()
    skillOffersRepository = new InMemorySkillOffersRepository()
    await charactersRepository.createMany(roster)
    await skillOffersRepository.createMany([offer])

    sut = new ChooseSkillOfferUseCase(
      skillOffersRepository,
      charactersRepository,
      new InMemoryCatalogRepository(catalog),
      new FakeClock()
    )
  })

  const keyOf = (id: { toValue(): string }) =>
    catalog.skills.get(id.toValue())!.key

  it('should be able to learn the chosen skill, stored outside the build', async () => {
    const skillKey = keyOf(offer.skillIds[0])

    const result = await sut.execute({
      offerId: offer.id.toString(),
      accountId,
      skillKey,
    })

    expect(result.isRight()).toBe(true)
    const learned = kael.skills.find((s) => s.skill.key === skillKey)
    expect(learned).toMatchObject({ source: 'OFFER', buildSlot: null })
    expect(offer.isPending).toBe(false)

    // a fila esvaziou
    const pending = await new FetchPendingSkillOffersUseCase(
      charactersRepository,
      skillOffersRepository
    ).execute({ accountId })
    expect(pending.value.offers).toEqual([])
  })

  it('should not be able to choose a skill outside the block', async () => {
    const result = await sut.execute({
      offerId: offer.id.toString(),
      accountId,
      skillKey: 'kael-vaz:qualquer',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidSkillOfferError)
    expect(offer.isPending).toBe(true)
  })

  it('should not be able to choose in a block of another account', async () => {
    const result = await sut.execute({
      offerId: offer.id.toString(),
      accountId: 'outra-conta',
      skillKey: keyOf(offer.skillIds[0]),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(NotAllowedError)
  })

  it('should not be able to choose in an unknown block', async () => {
    const result = await sut.execute({
      offerId: 'ninguem',
      accountId,
      skillKey: 'qualquer',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
