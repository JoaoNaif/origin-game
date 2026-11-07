import { Either, right } from '@/core/either'
import { Chest } from '../../entities/chest'
import { ChestsRepository } from '../repositories/chests-repository'

interface FetchAccountChestsUseCaseRequest {
  accountId: string
}

type FetchAccountChestsUseCaseResponse = Either<never, { chests: Chest[] }>

/** Os baús fechados da conta logada, do mais antigo para o mais novo. */
export class FetchAccountChestsUseCase {
  constructor(private chestsRepository: ChestsRepository) {}

  async execute({
    accountId,
  }: FetchAccountChestsUseCaseRequest): Promise<FetchAccountChestsUseCaseResponse> {
    const chests = await this.chestsRepository.listClosedByAccountId(accountId)

    return right({ chests })
  }
}
