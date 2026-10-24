import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Battle } from '../../entities/battle'
import { BattlesRepository } from '../repositories/battles-repository'

/** A batalha pelo id, só se for da conta (batalha de outra conta = `NotAllowedError`). */
export async function findOwnedBattle(
  battlesRepository: BattlesRepository,
  battleId: string,
  accountId: string
): Promise<Either<ResourceNotFoundError | NotAllowedError, Battle>> {
  const battle = await battlesRepository.findById(battleId)
  if (!battle) return left(new ResourceNotFoundError('batalha'))
  if (battle.accountId.toString() !== accountId) {
    return left(new NotAllowedError())
  }

  return right(battle)
}
