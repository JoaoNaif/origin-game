import { beforeEach, describe, expect, it } from 'vitest'
import {
  makePveWorld,
  PveWorld,
  startWorldBattle,
} from 'test/factories/make-pve-world'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Battle } from '../../entities/battle'
import { BattleSide } from '../../enums/battle-enums'
import { replayBattle } from '../services/pve-session'
import { GetTurnOptionsUseCase } from './get-turn-options'

let world: PveWorld
let battle: Battle
let sut: GetTurnOptionsUseCase

describe('Get Turn Options', () => {
  beforeEach(async () => {
    world = await makePveWorld()
    battle = (await startWorldBattle(world)).battle
    sut = new GetTurnOptionsUseCase(world.battles)
  })

  it('should be able to list the legal actions of the player turn', async () => {
    const result = await sut.execute({
      battleId: battle.id.toString(),
      accountId: world.account.id.toString(),
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      const { turn, options } = result.value
      expect(turn.side).toBe(BattleSide.PLAYER)
      expect(options.length).toBeGreaterThan(0)

      // toda opção é aceita pelo motor (nada aqui é palpite)
      for (const option of options) {
        const engine = replayBattle(battle)
        if (engine.isLeft()) throw engine.value
        engine.value.nextTurn()
        expect(engine.value.act(option.payload).isRight()).toBe(true)
      }

      // skill vem com a prévia; mover/trocar/defender não
      const skills = options.filter((o) => o.payload.type === 'SKILL')
      expect(skills.length).toBeGreaterThan(0)
      expect(skills.every((o) => o.preview && o.preview.hits.length > 0)).toBe(
        true
      )
    }
  })

  it('should not be able to list the options of another account', async () => {
    const result = await sut.execute({
      battleId: battle.id.toString(),
      accountId: 'outra-conta',
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(NotAllowedError)
  })

  it('should not be able to list the options of an unknown battle', async () => {
    const result = await sut.execute({
      battleId: 'ninguem',
      accountId: world.account.id.toString(),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
