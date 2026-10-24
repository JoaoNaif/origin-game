import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { BattleEngine } from '../../engine/battle-engine'
import { Battle } from '../../entities/battle'
import { InvalidBattleError } from '../../errors/invalid-battle-error'
import { BattlesRepository } from '../repositories/battles-repository'
import { replayBattle } from '../services/pve-session'

interface GetBattleUseCaseRequest {
  battleId: string
}

type GetBattleUseCaseResponse = Either<
  ResourceNotFoundError | InvalidBattleError,
  { battle: Battle; engine: BattleEngine }
>

/** A batalha como está agora (reconstruída pelo replay), para retomar a tela ou ver o resultado. */
export class GetBattleUseCase {
  constructor(private battlesRepository: BattlesRepository) {}

  async execute({
    battleId,
  }: GetBattleUseCaseRequest): Promise<GetBattleUseCaseResponse> {
    const battle = await this.battlesRepository.findById(battleId)
    if (!battle) return left(new ResourceNotFoundError('batalha'))

    const replayed = replayBattle(battle)
    if (replayed.isLeft()) return left(replayed.value)

    // posiciona na vez atual (o replay para logo depois da última ação)
    replayed.value.nextTurn()

    return right({ battle, engine: replayed.value })
  }
}
