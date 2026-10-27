import { Either, right } from '@/core/either'
import {
  AccountSummary,
  AccountsRepository,
} from '../repositories/accounts-repository'

type FetchAccountsUseCaseResponse = Either<
  never,
  { accounts: AccountSummary[] }
>

/** Admin: todas as contas, pelo username, com quantos personagens e batalhas cada uma tem. */
export class FetchAccountsUseCase {
  constructor(private accountsRepository: AccountsRepository) {}

  async execute(): Promise<FetchAccountsUseCaseResponse> {
    const accounts = await this.accountsRepository.listSummaries()

    return right({ accounts })
  }
}
