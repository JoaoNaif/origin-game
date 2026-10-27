import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { Account } from '@/domain/accounts/entities/account'
import { BattleStatus } from '../../enums/battle-enums'
import {
  BattleSummary,
  BattlesRepository,
} from '../repositories/battles-repository'
import { BATTLE_LIST_LIMIT } from './fetch-account-battles'

interface FetchBattlesByUsernameUseCaseRequest {
  username: string
  status?: BattleStatus
}

type FetchBattlesByUsernameUseCaseResponse = Either<
  ResourceNotFoundError,
  { battles: BattleSummary[] }
>

/** Admin: as batalhas de qualquer conta, pelo username, como em `GET /me/battles` (as 50 mais recentes). */
export class FetchBattlesByUsernameUseCase {
  constructor(
    private accountsRepository: AccountsRepository,
    private battlesRepository: BattlesRepository
  ) {}

  async execute({
    username,
    status,
  }: FetchBattlesByUsernameUseCaseRequest): Promise<FetchBattlesByUsernameUseCaseResponse> {
    const account = await this.accountsRepository.findByUsername(
      Account.normalizeUsername(username)
    )
    if (!account) return left(new ResourceNotFoundError('conta'))

    const battles = await this.battlesRepository.listByAccountId(
      account.id.toString(),
      { status, limit: BATTLE_LIST_LIMIT }
    )

    return right({ battles })
  }
}
