import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Beast } from '../../entities/beast'
import { BeastsRepository } from '../repositories/beasts-repository'

/** A besta pelo id, só se for da conta (de outra conta = `NotAllowedError`). */
export async function findOwnedBeast(
  beastsRepository: BeastsRepository,
  beastId: string,
  accountId: string
): Promise<Either<ResourceNotFoundError | NotAllowedError, Beast>> {
  const beast = await beastsRepository.findById(beastId)
  if (!beast) return left(new ResourceNotFoundError('besta'))
  if (beast.accountId.toString() !== accountId) {
    return left(new NotAllowedError())
  }

  return right(beast)
}
