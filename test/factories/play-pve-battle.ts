import { aiDecisionRng, MachineAi } from '@/domain/ai/machine-ai'
import { CharacterReward } from '@/domain/combat/applications/services/battle-rewards'
import { replayBattle } from '@/domain/combat/applications/services/pve-session'
import { DraftPveBattleUseCase } from '@/domain/combat/applications/use-cases/draft-pve-battle'
import { StartPveBattleUseCase } from '@/domain/combat/applications/use-cases/start-pve-battle'
import { SubmitBattleActionUseCase } from '@/domain/combat/applications/use-cases/submit-battle-action'
import { BattleEngine } from '@/domain/combat/engine/battle-engine'
import { Battle } from '@/domain/combat/entities/battle'
import { BattleSide } from '@/domain/combat/enums/battle-enums'
import { BattleActionPayload } from '@/domain/combat/value-objects/battle-action'
import { PveWorld } from './make-pve-world'

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

/**
 * Joga uma batalha PvE inteira pelos casos de uso (pré-batalha, início e jogadas da IA pelo jogador) e devolve a
 * batalha do início, a terminada e o que o fim entregou.
 */
export async function playPveBattle(
  world: PveWorld,
  npcSquadKey: string
): Promise<{ started: Battle; battle: Battle; rewards: CharacterReward[] }> {
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

  return { started: started.value.battle, battle: current, rewards }
}
