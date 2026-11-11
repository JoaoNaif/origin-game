import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Gear } from '../../entities/gear'
import { GearRepository } from '../repositories/gear-repository'

/** O equipamento pelo id, só se for da conta (de outra conta = `NotAllowedError`). */
export async function findOwnedGear(
  gearRepository: GearRepository,
  gearId: string,
  accountId: string
): Promise<Either<ResourceNotFoundError | NotAllowedError, Gear>> {
  const gear = await gearRepository.findById(gearId)
  if (!gear) return left(new ResourceNotFoundError('equipamento'))
  if (gear.accountId.toString() !== accountId) {
    return left(new NotAllowedError())
  }

  return right(gear)
}
