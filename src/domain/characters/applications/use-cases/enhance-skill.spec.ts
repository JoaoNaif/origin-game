import { beforeEach, describe, expect, it } from 'vitest'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { InsufficientFundsError } from '@/domain/economy/errors/insufficient-funds-error'
import { makeAccount } from 'test/factories/make-account'
import { characterOf, makeRoster } from 'test/factories/make-roster'
import { FakeSeedGenerator } from 'test/gateways/fake-seed-generator'
import { seedCatalog } from 'test/repositories/in-memory-catalog-repository'
import { InMemoryCharactersRepository } from 'test/repositories/in-memory-characters-repository'
import { InMemoryWalletsRepository } from 'test/repositories/in-memory-wallets-repository'
import { Character } from '../../entities/character'
import { InvalidCharacterError } from '../../errors/invalid-character-error'
import { EnhanceSkillUseCase } from './enhance-skill'

let charactersRepository: InMemoryCharactersRepository
let walletsRepository: InMemoryWalletsRepository
let kael: Character
let accountId: string
let sut: EnhanceSkillUseCase

/** Básica do Kael (Explosão, Vetorial): 300 M + 3 fragmentos Vetoriais por tentativa. */
const SKILL = 'kael-vaz:soco-explosivo'

describe('Enhance Skill', () => {
  beforeEach(async () => {
    const catalog = seedCatalog()
    const account = makeAccount()
    accountId = account.id.toString()
    const roster = makeRoster(account, catalog)
    kael = characterOf(roster, catalog, 'kael-vaz')

    charactersRepository = new InMemoryCharactersRepository()
    walletsRepository = new InMemoryWalletsRepository()
    await charactersRepository.createMany(roster)

    sut = new EnhanceSkillUseCase(
      charactersRepository,
      walletsRepository,
      new FakeSeedGenerator()
    )
  })

  it('should be able to pay each attempt and enhance the skill with 25% chance', async () => {
    const skill = kael.skills.find((s) => s.skill.key === SKILL)!
    expect(skill.skill.tier).toBe('BASIC')
    expect(skill.skill.lineage).toBe('VECTORIAL')
    await walletsRepository.give(accountId, 30_000, { VECTORIAL: 300 })

    let attempts = 0
    let success = false
    while (!success && attempts < 100) {
      const result = await sut.execute({
        characterId: kael.id.toString(),
        accountId,
        skillKey: SKILL,
      })
      if (result.isLeft()) throw result.value
      expect(result.value.chance).toBe(0.25)
      success = result.value.success
      attempts++
    }

    expect(success).toBe(true)
    expect(skill.isEnhanced).toBe(true)
    const wallet = await walletsRepository.findByAccountId(accountId)
    expect(wallet.coins).toBe(30_000 - attempts * 300)
    expect(wallet.fragmentsOf('VECTORIAL')).toBe(300 - attempts * 3)

    // um aprimoramento só
    const again = await sut.execute({
      characterId: kael.id.toString(),
      accountId,
      skillKey: SKILL,
    })
    expect(again.value).toBeInstanceOf(InvalidCharacterError)
  })

  it('should not be able to try without the cost', async () => {
    await walletsRepository.give(accountId, 300, { VECTORIAL: 2 })

    const result = await sut.execute({
      characterId: kael.id.toString(),
      accountId,
      skillKey: SKILL,
    })

    expect(result.value).toBeInstanceOf(InsufficientFundsError)
  })

  it('should not be able to enhance a skill it has not learned or of another account', async () => {
    await walletsRepository.give(accountId, 30_000, { VECTORIAL: 300 })

    const unknown = await sut.execute({
      characterId: kael.id.toString(),
      accountId,
      skillKey: 'kael-vaz:nao-existe',
    })
    const other = await sut.execute({
      characterId: kael.id.toString(),
      accountId: 'outra-conta',
      skillKey: SKILL,
    })

    expect(unknown.value).toBeInstanceOf(InvalidCharacterError)
    expect(other.value).toBeInstanceOf(NotAllowedError)
  })
})
