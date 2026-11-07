import { beforeEach, describe, expect, it } from 'vitest'
import { aiDecisionRng, MachineAi } from '@/domain/ai/machine-ai'
import { Character } from '@/domain/characters/entities/character'
import { characterOf } from 'test/factories/make-roster'
import { makePveWorld, PveWorld } from 'test/factories/make-pve-world'
import { BattleEngine } from '../../engine/battle-engine'
import { Battle } from '../../entities/battle'
import { BattleSide } from '../../enums/battle-enums'
import { BattleActionPayload } from '../../value-objects/battle-action'
import { DraftPveBattleUseCase } from '../use-cases/draft-pve-battle'
import { StartPveBattleUseCase } from '../use-cases/start-pve-battle'
import { SubmitBattleActionUseCase } from '../use-cases/submit-battle-action'
import { replayBattle } from './pve-session'
import { CharacterReward } from './battle-rewards'

let world: PveWorld
let gaia: Character

/** O "jogador" do teste: a IA iniciante jogando pelo lado do jogador. */
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

/** Joga uma batalha inteira contra o squad de NPC e devolve o que o fim entregou. */
async function playBattle(npcSquadKey: string): Promise<CharacterReward[]> {
  const accountId = world.account.id.toString()
  const drafted = await new DraftPveBattleUseCase(
    world.accounts,
    world.catalogRepository,
    world.drafts,
    world.seeds,
    world.clock
  ).execute({ accountId, npcSquadKey })
  if (drafted.isLeft()) throw drafted.value

  const started = await new StartPveBattleUseCase(
    world.accounts,
    world.characters,
    world.squads,
    world.catalogRepository,
    world.drafts,
    world.battles,
    world.skillOffers,
    world.wallets,
    world.chests,
    world.clock
  ).execute({
    accountId,
    draftId: drafted.value.draft.id.toString(),
    squadId: world.squad.id.toString(),
  })
  if (started.isLeft()) throw started.value

  const submit = new SubmitBattleActionUseCase(
    world.battles,
    world.characters,
    world.skillOffers,
    world.catalogRepository,
    world.wallets,
    world.chests,
    world.clock
  )

  let current = started.value.battle
  let rewards = started.value.rewards
  for (let i = 0; i < 400 && !current.isFinished; i++) {
    const result = await submit.execute({
      battleId: current.id.toString(),
      accountId,
      payload: playerMove(current),
    })
    if (result.isLeft()) throw result.value
    current = result.value.battle
    rewards = result.value.rewards
  }
  if (!current.isFinished) throw new Error('a batalha não acabou')

  return rewards
}

/** A Gaia com o Cristal sorteado e as 3 missões já cumpridas: desperta na próxima batalha que contar. */
function presetCompletedMissions() {
  const cristal = [...world.catalog.awakenings.values()].find(
    (a) => a.key === 'cristal'
  )!
  const started = gaia.startAwakening({
    awakeningId: cristal.id,
    drawnAt: new Date('2026-11-01T00:00:00Z'),
    missions: [
      { kind: 'SUPPORT_ACTIONS', threshold: 100, progress: 100 },
      { kind: 'SUPPORT_SHARE', threshold: 15, progress: 15 },
      { kind: 'SOLE_SURVIVOR_WIN', threshold: 1, progress: 1 },
    ],
  })
  if (started.isLeft()) throw started.value
}

describe('Battle Rewards (awakening)', () => {
  beforeEach(async () => {
    world = await makePveWorld(80)
    gaia = characterOf(world.roster, world.catalog, 'gaia')
  })

  it('should be able to draw the awakening at the end of a battle at level 80', async () => {
    expect(gaia.awakening).toBeNull()

    await playBattle('balanced-beginner')

    const saved = await world.characters.findById(gaia.id.toString())
    const cristal = [...world.catalog.awakenings.values()].find(
      (a) => a.key === 'cristal'
    )!
    expect(saved!.awakening!.awakeningId.equals(cristal.id)).toBe(true)
    // as missões contam a partir da batalha seguinte; o jogador só vê a dica
    expect(saved!.awakening!.missions.every((m) => m.progress === 0)).toBe(true)
    expect(saved!.awakeningHint).toBe('SILENT')
    expect(saved!.isAwakened).toBe(false)
  }, 60_000)

  it('should be able to awaken and open the catch-up blocks when the 3 missions are done', async () => {
    presetCompletedMissions()

    const rewards = await playBattle('balanced-intermediate')

    const saved = await world.characters.findById(gaia.id.toString())
    expect(saved!.isAwakened).toBe(true)
    expect(saved!.awakeningHint).toBe('AWAKENED')
    const reward = rewards.find((r) => r.characterId === gaia.id.toString())!
    expect(reward.awakened).toBe(true)

    const offers = world.skillOffers.items.filter(
      (o) => o.characterId.equals(gaia.id) && o.source === 'AWAKENING'
    )
    expect(offers.map((o) => o.level)).toEqual([80])
    expect(
      offers[0].skillIds.some(
        (id) => world.catalog.skills.get(id.toValue())!.isAwakened
      )
    ).toBe(true)
    expect(reward.newSkillOffers).toBeGreaterThanOrEqual(1)
  }, 60_000)

  it('should not be able to count a Beginner battle for the missions (anti-farm)', async () => {
    presetCompletedMissions()

    const rewards = await playBattle('balanced-beginner')

    const saved = await world.characters.findById(gaia.id.toString())
    expect(saved!.isAwakened).toBe(false)
    expect(
      rewards.find((r) => r.characterId === gaia.id.toString())!.awakened
    ).toBeUndefined()
  }, 60_000)
})
