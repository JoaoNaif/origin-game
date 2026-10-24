import { beforeEach, describe, expect, it } from 'vitest'
import { makeAccount } from 'test/factories/make-account'
import { makePveWorld, PveWorld } from 'test/factories/make-pve-world'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { BattleSide } from '../../enums/battle-enums'
import { DraftPveBattleUseCase } from './draft-pve-battle'
import { StartPveBattleUseCase } from './start-pve-battle'

let world: PveWorld
let draftId: string
let sut: StartPveBattleUseCase

describe('Start Pve Battle', () => {
  beforeEach(async () => {
    world = await makePveWorld()
    const drafted = await new DraftPveBattleUseCase(
      world.accounts,
      world.catalogRepository,
      world.drafts,
      world.seeds,
      world.clock
    ).execute({
      accountId: world.account.id.toString(),
      npcSquadKey: 'balanced-beginner',
    })
    if (drafted.isLeft()) throw drafted.value
    draftId = drafted.value.draft.id.toString()

    sut = new StartPveBattleUseCase(
      world.accounts,
      world.characters,
      world.squads,
      world.catalogRepository,
      world.drafts,
      world.battles,
      world.clock
    )
  })

  it('should be able to start the battle and stop on the player turn', async () => {
    const result = await sut.execute({
      accountId: world.account.id.toString(),
      draftId,
      squadId: world.squad.id.toString(),
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      const { battle, engine } = result.value
      expect(world.battles.items).toEqual([battle])
      expect(world.drafts.items).toHaveLength(0)
      expect(battle.seed).toBe(42)
      expect(battle.snapshot.field.initial?.key).toBeDefined()
      expect(battle.snapshot.player.units.map((u) => u.characterId)).toEqual(
        world.squad.members.map((m) => m.characterId.toString())
      )
      // tudo que a máquina jogou ficou no log, e agora é a vez do jogador
      expect(battle.actions.every((a) => a.side === BattleSide.OPPONENT)).toBe(
        true
      )
      expect(engine.nextTurn()?.side).toBe(BattleSide.PLAYER)
    }
  })

  it('should be able to start only one battle from a draft (double submit)', async () => {
    const request = {
      accountId: world.account.id.toString(),
      draftId,
      squadId: world.squad.id.toString(),
    }

    const results = await Promise.all([
      sut.execute(request),
      sut.execute(request),
    ])

    expect(results.filter((r) => r.isRight())).toHaveLength(1)
    expect(results.find((r) => r.isLeft())?.value).toBeInstanceOf(
      ResourceNotFoundError
    )
    expect(world.battles.items).toHaveLength(1)
  })

  it('should not be able to start with a squad of another account', async () => {
    const other = makeAccount({ username: 'outra_conta' })
    await world.accounts.create(other)
    const otherDraft = await new DraftPveBattleUseCase(
      world.accounts,
      world.catalogRepository,
      world.drafts,
      world.seeds,
      world.clock
    ).execute({
      accountId: other.id.toString(),
      npcSquadKey: 'balanced-beginner',
    })
    if (otherDraft.isLeft()) throw otherDraft.value

    const result = await sut.execute({
      accountId: other.id.toString(),
      draftId: otherDraft.value.draft.id.toString(),
      squadId: world.squad.id.toString(),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(NotAllowedError)
  })

  it('should not be able to use the draft of another account', async () => {
    const result = await sut.execute({
      accountId: 'outra-conta',
      draftId,
      squadId: world.squad.id.toString(),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(NotAllowedError)
    expect(world.drafts.items).toHaveLength(1)
  })

  it('should not be able to start from an unknown draft', async () => {
    const result = await sut.execute({
      accountId: world.account.id.toString(),
      draftId: 'ninguem',
      squadId: world.squad.id.toString(),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
