import { Either, right } from '@/core/either'
import { Squad } from '../../entities/squad'
import { SquadsRepository } from '../repositories/squads-repository'

interface FetchAccountSquadsUseCaseRequest {
  accountId: string
}

type FetchAccountSquadsUseCaseResponse = Either<never, { squads: Squad[] }>

/** As formações salvas da conta logada. */
export class FetchAccountSquadsUseCase {
  constructor(private squadsRepository: SquadsRepository) {}

  async execute({
    accountId,
  }: FetchAccountSquadsUseCaseRequest): Promise<FetchAccountSquadsUseCaseResponse> {
    const squads = await this.squadsRepository.findManyByAccountId(accountId)

    return right({ squads })
  }
}
