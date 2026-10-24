import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { Account } from '@/domain/accounts/entities/account'
import { Squad } from '../../entities/squad'
import { SquadsRepository } from '../repositories/squads-repository'

interface FetchAccountSquadsUseCaseRequest {
  username: string
}

type FetchAccountSquadsUseCaseResponse = Either<
  ResourceNotFoundError,
  { squads: Squad[] }
>

export class FetchAccountSquadsUseCase {
  constructor(
    private accountsRepository: AccountsRepository,
    private squadsRepository: SquadsRepository
  ) {}

  async execute({
    username,
  }: FetchAccountSquadsUseCaseRequest): Promise<FetchAccountSquadsUseCaseResponse> {
    const account = await this.accountsRepository.findByUsername(
      Account.normalizeUsername(username)
    )
    if (!account) return left(new ResourceNotFoundError('conta'))

    const squads = await this.squadsRepository.findManyByAccountId(
      account.id.toString()
    )

    return right({ squads })
  }
}
