import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Clock } from '@/core/gateways/clock'
import { BattleEngine } from '../../engine/battle-engine'
import { Battle } from '../../entities/battle'
import { InvalidBattleError } from '../../errors/invalid-battle-error'
import { BattlesRepository } from '../repositories/battles-repository'
import { findOwnedBattle } from '../services/owned-battle'
import { replayBattle } from '../services/pve-session'

interface ForfeitBattleUseCaseRequest {
  battleId: string
  accountId: string
}

type ForfeitBattleUseCaseResponse = Either<
  ResourceNotFoundError | NotAllowedError | InvalidBattleError,
  { battle: Battle; engine: BattleEngine }
>

/** Desistir (W.O., `ABANDON`): a máquina vence e a batalha sai da lista em andamento. Sem XP (D136, a confirmar). */
export class ForfeitBattleUseCase {
  constructor(
    private battlesRepository: BattlesRepository,
    private clock: Clock
  ) {}

  async execute({
    battleId,
    accountId,
  }: ForfeitBattleUseCaseRequest): Promise<ForfeitBattleUseCaseResponse> {
    const found = await findOwnedBattle(
      this.battlesRepository,
      battleId,
      accountId
    )
    if (found.isLeft()) return left(found.value)

    const battle = found.value
    const replayed = replayBattle(battle)
    if (replayed.isLeft()) return left(replayed.value)

    const forfeited = battle.forfeit(this.clock.now())
    if (forfeited.isLeft()) return left(forfeited.value)

    // uma jogada que terminou a batalha ao mesmo tempo ganha: esta não grava
    const saved = await this.battlesRepository.save(
      battle,
      battle.actions.length
    )
    if (!saved) {
      return left(new InvalidBattleError('a batalha já terminou: recarregue'))
    }

    return right({ battle, engine: replayed.value })
  }
}
