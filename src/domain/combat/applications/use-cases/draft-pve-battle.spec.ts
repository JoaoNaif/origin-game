import { beforeEach, describe, expect, it } from 'vitest'
import { makePveWorld, PveWorld } from 'test/factories/make-pve-world'
import { FakeSeedGenerator } from 'test/gateways/fake-seed-generator'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { DraftPveBattleUseCase } from './draft-pve-battle'

let world: PveWorld
let sut: DraftPveBattleUseCase

const makeSut = (w: PveWorld, seeds = w.seeds) =>
  new DraftPveBattleUseCase(
    w.accounts,
    w.catalogRepository,
    w.drafts,
    seeds,
    w.clock
  )

describe('Draft Pve Battle', () => {
  beforeEach(async () => {
    world = await makePveWorld()
    sut = makeSut(world)
  })

  it('should be able to draw the field before the squad is chosen', async () => {
    const result = await sut.execute({
      username: 'jogador_pve',
      npcSquadKey: 'balanced-beginner',
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      const { draft, npcSquad, field } = result.value
      expect(npcSquad.key).toBe('balanced-beginner')
      expect(field).not.toBeNull()
      expect(draft.fieldKey).toBe(field!.key)
      expect(draft.seed).toBe(42)
      expect(world.drafts.items).toEqual([draft])
    }
  })

  it('should be able to draw the same field for the same seed', async () => {
    const request = {
      username: 'jogador_pve',
      npcSquadKey: 'balanced-beginner',
    }

    const first = await makeSut(world, new FakeSeedGenerator(7)).execute(
      request
    )
    const again = await makeSut(world, new FakeSeedGenerator(7)).execute(
      request
    )

    expect(first.isRight() && again.isRight()).toBe(true)
    if (first.isRight() && again.isRight()) {
      expect(again.value.field?.key).toBe(first.value.field?.key)
    }
  })

  it('should not be able to draft against an unknown NPC squad', async () => {
    const result = await sut.execute({
      username: 'jogador_pve',
      npcSquadKey: 'ninguem',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
