import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Beast } from '../../entities/beast'
import { BeastsRepository } from '../repositories/beasts-repository'
import { findOwnedBeast } from '../services/owned-beast'

interface ReleaseBeastUseCaseRequest {
  accountId: string
  beastId: string
}

type ReleaseBeastUseCaseResponse = Either<
  ResourceNotFoundError | NotAllowedError,
  { beast: Beast }
>

/**
 * Desfaz o contrato, ou descarta a besta sem contrato (`progression_brief.md` 2.5): a besta é **perdida**, não volta ao
 * inventário e não rende nada. O front pede confirmação.
 */
export class ReleaseBeastUseCase {
  constructor(private beastsRepository: BeastsRepository) {}

  async execute({
    accountId,
    beastId,
  }: ReleaseBeastUseCaseRequest): Promise<ReleaseBeastUseCaseResponse> {
    const beast = await findOwnedBeast(
      this.beastsRepository,
      beastId,
      accountId
    )
    if (beast.isLeft()) return left(beast.value)

    if (!(await this.beastsRepository.delete(beast.value))) {
      return left(new ResourceNotFoundError('besta'))
    }

    return right({ beast: beast.value })
  }
}
