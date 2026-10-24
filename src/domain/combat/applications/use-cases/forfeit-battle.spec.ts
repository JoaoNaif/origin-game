import { beforeEach, describe, expect, it } from 'vitest'
import {
  makePveWorld,
  PveWorld,
  startWorldBattle,
} from 'test/factories/make-pve-world'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { Battle } from '../../entities/battle'
import { BattleEndReason, BattleSide } from '../../enums/battle-enums'
import { InvalidBattleError } from '../../errors/invalid-battle-error'
import { ForfeitBattleUseCase } from './forfeit-battle'

let world: PveWorld
let battle: Battle
let sut: ForfeitBattleUseCase

describe('Forfeit Battle', () => {
  beforeEach(async () => {
    world = await makePveWorld()
    battle = (await startWorldBattle(world)).battle
    sut = new ForfeitBattleUseCase(world.battles, world.clock)
  })

  it('should be able to give the win to the machine by forfeit', async () => {
    const result = await sut.execute({
      battleId: battle.id.toString(),
      accountId: world.account.id.toString(),
    })

    expect(result.isRight()).toBe(true)
    const saved = await world.battles.findById(battle.id.toString())
    expect(saved).toMatchObject({
      isFinished: true,
      winner: BattleSide.OPPONENT,
      endReason: BattleEndReason.ABANDON,
    })
    // sem XP (D136)
    expect(saved!.rewards).toEqual([])
    expect(world.characters.items.every((c) => c.xp === 0)).toBe(true)
  })

  it('should not be able to forfeit twice', async () => {
    const request = {
      battleId: battle.id.toString(),
      accountId: world.account.id.toString(),
    }
    await sut.execute(request)

    const again = await sut.execute(request)

    expect(again.isLeft()).toBe(true)
    expect(again.value).toBeInstanceOf(InvalidBattleError)
  })

  it('should not be able to forfeit the battle of another account', async () => {
    const result = await sut.execute({
      battleId: battle.id.toString(),
      accountId: 'outra-conta',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(NotAllowedError)
  })
})
