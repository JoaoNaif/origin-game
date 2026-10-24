import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Account } from '../../entities/account'
import { AccountsRepository } from '../repositories/accounts-repository'

interface FetchAccountByUsernameUseCaseRequest {
  username: string
}

type FetchAccountByUsernameUseCaseResponse = Either<
  ResourceNotFoundError,
  { account: Account }
>

/** Busca exata pelo username, normalizado como no cadastro (`Tester_01` acha `tester_01`). */
export class FetchAccountByUsernameUseCase {
  constructor(private accountsRepository: AccountsRepository) {}

  async execute({
    username,
  }: FetchAccountByUsernameUseCaseRequest): Promise<FetchAccountByUsernameUseCaseResponse> {
    const account = await this.accountsRepository.findByUsername(
      Account.normalizeUsername(username)
    )
    if (!account) return left(new ResourceNotFoundError('conta'))

    return right({ account })
  }
}
