import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { BattleEngine } from '../../engine/battle-engine'
import { BattleEvent } from '../../engine/battle-events'
import { Battle } from '../../entities/battle'
import { InvalidActionError } from '../../errors/invalid-action-error'
import { InvalidBattleError } from '../../errors/invalid-battle-error'
import { BattleActionPayload } from '../../value-objects/battle-action'
import { Clock } from '@/core/gateways/clock'
import { BattlesRepository } from '../repositories/battles-repository'
import { CharacterReward, grantBattleXp } from '../services/battle-rewards'
import { findOwnedBattle } from '../services/owned-battle'
import {
  eventsSince,
  finishIfOver,
  playMachineTurns,
  playPlayerTurn,
  replayBattle,
} from '../services/pve-session'

interface SubmitBattleActionUseCaseRequest {
  battleId: string
  accountId: string
  payload: BattleActionPayload
}

type SubmitBattleActionUseCaseResponse = Either<
  | ResourceNotFoundError
  | NotAllowedError
  | InvalidBattleError
  | InvalidActionError,
  {
    battle: Battle
    engine: BattleEngine
    /** O que esta jogada produziu: a ação do jogador e as vezes da máquina que vieram depois. */
    events: readonly BattleEvent[]
    rewards: CharacterReward[]
  }
>

/**
 * Jogada do jogador (o servidor é a autoridade, D9): refaz a batalha pelo replay, valida a ação no motor, grava e
 * joga as vezes da máquina até a próxima vez do jogador. No fim, entrega o XP.
 */
export class SubmitBattleActionUseCase {
  constructor(
    private battlesRepository: BattlesRepository,
    private charactersRepository: CharactersRepository,
    private clock: Clock
  ) {}

  async execute({
    battleId,
    accountId,
    payload,
  }: SubmitBattleActionUseCaseRequest): Promise<SubmitBattleActionUseCaseResponse> {
    const found = await findOwnedBattle(
      this.battlesRepository,
      battleId,
      accountId
    )
    if (found.isLeft()) return left(found.value)

    const battle = found.value
    if (battle.isFinished) {
      return left(new InvalidBattleError('a batalha já terminou'))
    }

    const replayed = replayBattle(battle)
    if (replayed.isLeft()) return left(replayed.value)

    const engine = replayed.value
    const from = engine.events.length
    const knownActions = battle.actions.length

    const played = playPlayerTurn(battle, engine, payload)
    if (played.isLeft()) return left(played.value)

    const machine = playMachineTurns(battle, engine)
    if (machine.isLeft()) return left(machine.value)

    const finished = finishIfOver(battle, engine, this.clock.now())
    if (finished.isLeft()) return left(finished.value)

    // outra requisição gravou primeiro (jogada enviada duas vezes): esta não grava nem entrega XP de novo
    const saved = await this.battlesRepository.save(battle, knownActions)
    if (!saved) {
      return left(
        new InvalidBattleError('a batalha já recebeu outra jogada: recarregue')
      )
    }

    const rewards = await grantBattleXp(
      battle,
      engine,
      this.charactersRepository,
      this.battlesRepository
    )

    return right({
      battle,
      engine,
      events: eventsSince(engine, from),
      rewards,
    })
  }
}
