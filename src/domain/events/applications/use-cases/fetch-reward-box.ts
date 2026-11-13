import { Either, right } from '@/core/either'
import { Clock } from '@/core/gateways/clock'
import { PendingReward } from '../../entities/pending-reward'
import { PendingRewardsRepository } from '../repositories/pending-rewards-repository'

interface FetchRewardBoxUseCaseRequest {
  accountId: string
}

type FetchRewardBoxUseCaseResponse = Either<never, { rewards: PendingReward[] }>

/** A caixa de recompensas da conta (D155, `events_brief.md` 4.4): só as ainda no prazo, com a data limite. */
export class FetchRewardBoxUseCase {
  constructor(
    private pendingRewardsRepository: PendingRewardsRepository,
    private clock: Clock
  ) {}

  async execute({
    accountId,
  }: FetchRewardBoxUseCaseRequest): Promise<FetchRewardBoxUseCaseResponse> {
    const rewards = await this.pendingRewardsRepository.findActiveByAccountId(
      accountId,
      this.clock.now()
    )

    return right({ rewards })
  }
}
