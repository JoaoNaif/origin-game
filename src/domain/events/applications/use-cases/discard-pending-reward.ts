import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { PendingReward } from '../../entities/pending-reward'
import { PendingRewardsRepository } from '../repositories/pending-rewards-repository'

interface DiscardPendingRewardUseCaseRequest {
  accountId: string
  pendingRewardId: string
}

type DiscardPendingRewardUseCaseResponse = Either<
  ResourceNotFoundError | NotAllowedError,
  { pending: PendingReward }
>

/** Descarta um prêmio da caixa de recompensas (D155, `events_brief.md` 4.4): some de vez, sem moeda. */
export class DiscardPendingRewardUseCase {
  constructor(private pendingRewardsRepository: PendingRewardsRepository) {}

  async execute({
    accountId,
    pendingRewardId,
  }: DiscardPendingRewardUseCaseRequest): Promise<DiscardPendingRewardUseCaseResponse> {
    const pending =
      await this.pendingRewardsRepository.findById(pendingRewardId)
    if (!pending) return left(new ResourceNotFoundError('recompensa pendente'))
    if (pending.accountId.toString() !== accountId) {
      return left(new NotAllowedError())
    }

    if (!(await this.pendingRewardsRepository.delete(pending))) {
      return left(new ResourceNotFoundError('recompensa pendente'))
    }

    return right({ pending })
  }
}
