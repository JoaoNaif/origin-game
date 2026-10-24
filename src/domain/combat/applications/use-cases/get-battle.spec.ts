import { beforeEach, describe, expect, it } from 'vitest'
import { makePveWorld, PveWorld } from 'test/factories/make-pve-world'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { BattleSide } from '../../enums/battle-enums'
import { DraftPveBattleUseCase } from './draft-pve-battle'
import { GetBattleUseCase } from './get-battle'
import { StartPveBattleUseCase } from './start-pve-battle'

let world: PveWorld
let sut: GetBattleUseCase

describe('Get Battle', () => {
  beforeEach(async () => {
    world = await makePveWorld()
    sut = new GetBattleUseCase(world.battles)
  })

  it('should be able to rebuild the battle on the current turn', async () => {
    const drafted = await new DraftPveBattleUseCase(
      world.accounts,
      world.catalogRepository,
      world.drafts,
      world.seeds,
      world.clock
    ).execute({ username: 'jogador_pve', npcSquadKey: 'balanced-beginner' })
    if (drafted.isLeft()) throw drafted.value
    const started = await new StartPveBattleUseCase(
      world.accounts,
      world.characters,
      world.squads,
      world.catalogRepository,
      world.drafts,
      world.battles,
      world.clock
    ).execute({
      draftId: drafted.value.draft.id.toString(),
      squadId: world.squad.id.toString(),
    })
    if (started.isLeft()) throw started.value

    const result = await sut.execute({
      battleId: started.value.battle.id.toString(),
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      expect(result.value.engine.currentRef).toBe(
        started.value.engine.currentRef
      )
      expect(result.value.engine.nextTurn()?.side).toBe(BattleSide.PLAYER)
      expect(result.value.engine.events).toEqual(started.value.engine.events)
    }
  })

  it('should not be able to get an unknown battle', async () => {
    const result = await sut.execute({ battleId: 'ninguem' })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
