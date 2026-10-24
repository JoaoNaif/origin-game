import { beforeEach, describe, expect, it } from 'vitest'
import {
  makePveWorld,
  PveWorld,
  startWorldBattle,
} from 'test/factories/make-pve-world'
import { BattleStatus } from '../../enums/battle-enums'
import { FetchAccountBattlesUseCase } from './fetch-account-battles'

let world: PveWorld
let sut: FetchAccountBattlesUseCase

describe('Fetch Account Battles', () => {
  beforeEach(async () => {
    world = await makePveWorld()
    sut = new FetchAccountBattlesUseCase(world.battles)
  })

  it('should be able to list the battles of the account, newest first', async () => {
    const first = (await startWorldBattle(world)).battle
    const second = (await startWorldBattle(world)).battle

    const result = await sut.execute({
      accountId: world.account.id.toString(),
    })

    expect(result.value.battles.map((b) => b.id)).toEqual([
      second.id.toString(),
      first.id.toString(),
    ])
    expect(result.value.battles[0]).toMatchObject({
      status: BattleStatus.IN_PROGRESS,
      opponent: { profile: 'BALANCED', difficulty: 'BEGINNER' },
      squadId: world.squad.id.toString(),
    })
  })

  it('should be able to filter by status', async () => {
    await startWorldBattle(world)

    const finished = await sut.execute({
      accountId: world.account.id.toString(),
      status: BattleStatus.FINISHED,
    })

    expect(finished.value.battles).toEqual([])
  })

  it('should not list the battles of another account', async () => {
    await startWorldBattle(world)

    const result = await sut.execute({ accountId: 'outra-conta' })

    expect(result.value.battles).toEqual([])
  })
})
