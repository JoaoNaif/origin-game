import { beforeEach, describe, expect, it } from 'vitest'
import { makePveWorld, PveWorld } from 'test/factories/make-pve-world'
import { aiDecisionRng, MachineAi } from '@/domain/ai/machine-ai'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { InvalidActionError } from '../../errors/invalid-action-error'
import { InvalidBattleError } from '../../errors/invalid-battle-error'
import { BattleEngine } from '../../engine/battle-engine'
import { Battle } from '../../entities/battle'
import { BattleSide, BattleStatus } from '../../enums/battle-enums'
import { BattleActionPayload } from '../../value-objects/battle-action'
import { replayBattle } from '../services/pve-session'
import { DraftPveBattleUseCase } from './draft-pve-battle'
import { StartPveBattleUseCase } from './start-pve-battle'
import { SubmitBattleActionUseCase } from './submit-battle-action'

let world: PveWorld
let battle: Battle
let sut: SubmitBattleActionUseCase

/** O "jogador" do teste: a IA iniciante, sem previsão, jogando pelo lado do jogador. */
function playerMove(current: Battle): BattleActionPayload {
  const engine = replayBattle(current)
  if (engine.isLeft()) throw engine.value
  const turn = (engine.value as BattleEngine).nextTurn()!

  return new MachineAi(
    {
      side: BattleSide.PLAYER,
      profile: 'BALANCED',
      difficulty: 'BEGINNER',
      planning: false,
    },
    aiDecisionRng(current.seed, BattleSide.PLAYER, current.actions.length)
  ).decide(engine.value, turn.ref).payload
}

describe('Submit Battle Action', () => {
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

    const started = await new StartPveBattleUseCase(
      world.accounts,
      world.characters,
      world.squads,
      world.catalogRepository,
      world.drafts,
      world.battles,
      world.clock
    ).execute({
      accountId: world.account.id.toString(),
      draftId: drafted.value.draft.id.toString(),
      squadId: world.squad.id.toString(),
    })
    if (started.isLeft()) throw started.value
    battle = started.value.battle

    sut = new SubmitBattleActionUseCase(
      world.battles,
      world.characters,
      world.clock
    )
  })

  it('should be able to play the player turn and then the machine turns', async () => {
    const before = battle.actions.length

    const result = await sut.execute({
      battleId: battle.id.toString(),
      accountId: world.account.id.toString(),
      payload: playerMove(battle),
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      const recorded = result.value.battle.actions.slice(before)
      expect(recorded[0].side).toBe(BattleSide.PLAYER)
      expect(
        recorded.slice(1).every((a) => a.side === BattleSide.OPPONENT)
      ).toBe(true)
      expect(result.value.events[0]).toMatchObject({ type: expect.any(String) })
    }
  })

  it('should not be able to record the same turn twice (double submit)', async () => {
    const request = {
      battleId: battle.id.toString(),
      accountId: world.account.id.toString(),
      payload: playerMove(battle),
    }

    // duas requisições ao mesmo tempo, lendo o mesmo log
    const results = await Promise.all([
      sut.execute(request),
      sut.execute(request),
    ])

    const won = results.filter((r) => r.isRight())
    const lost = results.filter((r) => r.isLeft())
    expect(won).toHaveLength(1)
    expect(lost).toHaveLength(1)
    expect(lost[0].value).toBeInstanceOf(InvalidBattleError)

    const saved = await world.battles.findById(battle.id.toString())
    if (won[0].isRight()) {
      expect(saved!.actions).toEqual(won[0].value.battle.actions)
    }
  })

  it('should not be able to play an invalid action and keep the battle as it was', async () => {
    const before = battle.actions.length

    const result = await sut.execute({
      battleId: battle.id.toString(),
      accountId: world.account.id.toString(),
      payload: {
        type: 'SKILL',
        skillKey: 'nao-existe',
        targetSide: BattleSide.OPPONENT,
        target: { row: 0, column: 0 },
      },
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(InvalidActionError)
    expect(battle.actions).toHaveLength(before)
  })

  it('should not be able to play in the battle of another account', async () => {
    const before = battle.actions.length

    const result = await sut.execute({
      battleId: battle.id.toString(),
      accountId: 'outra-conta',
      payload: playerMove(battle),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(NotAllowedError)
    expect(battle.actions).toHaveLength(before)
  })

  it('should be able to play until the end and give XP to the 4 characters', async () => {
    let current = battle
    let rewards: { characterId: string; xp: number }[] = []

    for (let i = 0; i < 400 && !current.isFinished; i++) {
      const result = await sut.execute({
        battleId: current.id.toString(),
        accountId: world.account.id.toString(),
        payload: playerMove(current),
      })
      if (result.isLeft()) throw result.value
      current = result.value.battle
      rewards = result.value.rewards
    }

    expect(current.status).toBe(BattleStatus.FINISHED)
    expect(current.winner).not.toBeNull()
    expect(rewards).toHaveLength(4)
    expect(rewards.every((r) => r.xp > 0)).toBe(true)

    const squadIds = world.squad.members.map((m) => m.characterId.toString())
    const gained = world.characters.items.filter((c) =>
      squadIds.includes(c.id.toString())
    )
    expect(gained.every((c) => c.xp > 0 || c.level > 18)).toBe(true)

    // o log gravado reproduz a mesma batalha (replay, D8)
    const replayed = replayBattle(current)
    expect(replayed.isRight() && replayed.value.outcome?.winner).toBe(
      current.winner
    )

    const after = await sut.execute({
      battleId: current.id.toString(),
      accountId: world.account.id.toString(),
      payload: { type: 'DEFEND' },
    })
    expect(after.isLeft()).toBe(true)
    expect(after.value).toBeInstanceOf(InvalidBattleError)
  }, 60_000)
})
