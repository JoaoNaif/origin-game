import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Squad } from '../../entities/squad'
import { SquadsRepository } from '../repositories/squads-repository'

/** O squad pelo id, só se for da conta (squad de outra conta = `NotAllowedError`). */
export async function findOwnedSquad(
  squadsRepository: SquadsRepository,
  squadId: string,
  accountId: string
): Promise<Either<ResourceNotFoundError | NotAllowedError, Squad>> {
  const squad = await squadsRepository.findById(squadId)
  if (!squad) return left(new ResourceNotFoundError('squad'))
  if (squad.accountId.toString() !== accountId) {
    return left(new NotAllowedError())
  }

  return right(squad)
}
