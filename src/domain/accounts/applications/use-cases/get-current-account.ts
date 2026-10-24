import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Account } from '../../entities/account'
import { AccountsRepository } from '../repositories/accounts-repository'

interface GetCurrentAccountUseCaseRequest {
  accountId: string
}

type GetCurrentAccountUseCaseResponse = Either<
  ResourceNotFoundError,
  { account: Account }
>

/** A conta de quem está logado (`GET /me`). O presenter tira o hash da senha. */
export class GetCurrentAccountUseCase {
  constructor(private accountsRepository: AccountsRepository) {}

  async execute({
    accountId,
  }: GetCurrentAccountUseCaseRequest): Promise<GetCurrentAccountUseCaseResponse> {
    const account = await this.accountsRepository.findById(accountId)

    // conta apagada com o token de acesso ainda válido (até 15 min)
    if (!account) return left(new ResourceNotFoundError('conta'))

    return right({ account })
  }
}
