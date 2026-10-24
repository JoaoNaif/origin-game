import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import {
  Candidate,
  generateCandidates,
} from '@/domain/ai/services/action-generator'
import { ActorTurn, BattleEngine } from '../../engine/battle-engine'
import { Battle } from '../../entities/battle'
import { BattleSide } from '../../enums/battle-enums'
import { InvalidBattleError } from '../../errors/invalid-battle-error'
import { BattlesRepository } from '../repositories/battles-repository'
import { findOwnedBattle } from '../services/owned-battle'
import { replayBattle } from '../services/pve-session'

interface GetTurnOptionsUseCaseRequest {
  battleId: string
  accountId: string
}

type GetTurnOptionsUseCaseResponse = Either<
  ResourceNotFoundError | NotAllowedError | InvalidBattleError,
  {
    battle: Battle
    engine: BattleEngine
    turn: ActorTurn
    /** Jogadas legais da unidade da vez, com a prévia do motor nas skills (nada sorteado). */
    options: Candidate[]
  }
>

/**
 * O que o jogador pode fazer na vez dele (`engine.md` 3.13): cada skill pronta em cada alvo válido (com as escolhas
 * extras de trocar inimigos, avançar, mover aliado e trocar campo), mover, trocar com aliado e, só sem skill
 * possível, Defender (D38). É a mesma lista que a IA usa, então o front não precisa repetir as regras do motor.
 */
export class GetTurnOptionsUseCase {
  constructor(private battlesRepository: BattlesRepository) {}

  async execute({
    battleId,
    accountId,
  }: GetTurnOptionsUseCaseRequest): Promise<GetTurnOptionsUseCaseResponse> {
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
    const turn = engine.nextTurn()
    if (!turn) return left(new InvalidBattleError('a batalha já terminou'))
    if (turn.side !== BattleSide.PLAYER) {
      return left(new InvalidBattleError('não é a vez do jogador'))
    }

    return right({
      battle,
      engine,
      turn,
      options: generateCandidates(engine, turn.ref),
    })
  }
}
