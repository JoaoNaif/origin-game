import { Either, right } from '@/core/either'
import { BattleStatus } from '../../enums/battle-enums'
import {
  BattleSummary,
  BattlesRepository,
} from '../repositories/battles-repository'

/** Quantas batalhas a lista traz (as mais recentes). */
export const BATTLE_LIST_LIMIT = 50

interface FetchAccountBattlesUseCaseRequest {
  accountId: string
  /** Só em andamento (retomar) ou só encerradas (histórico); sem filtro, as duas. */
  status?: BattleStatus
}

type FetchAccountBattlesUseCaseResponse = Either<
  never,
  { battles: BattleSummary[] }
>

/** As batalhas da conta logada: a em andamento para retomar (aba fechada, outro aparelho) e o histórico. */
export class FetchAccountBattlesUseCase {
  constructor(private battlesRepository: BattlesRepository) {}

  async execute({
    accountId,
    status,
  }: FetchAccountBattlesUseCaseRequest): Promise<FetchAccountBattlesUseCaseResponse> {
    const battles = await this.battlesRepository.listByAccountId(accountId, {
      status,
      limit: BATTLE_LIST_LIMIT,
    })

    return right({ battles })
  }
}
