import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Clock } from '@/core/gateways/clock'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { inventoryUsage } from '@/domain/economy/applications/services/inventory-usage'
import { PendingReward } from '../../entities/pending-reward'
import { InvalidPendingRewardError } from '../../errors/invalid-pending-reward-error'
import { GrantedEventReward } from '../../value-objects/event-battle-outcome'
import { PendingRewardsRepository } from '../repositories/pending-rewards-repository'
import {
  EventRewardsDeps,
  grantEventRewards,
} from '../services/grant-event-rewards'

interface ClaimPendingRewardUseCaseRequest {
  accountId: string
  pendingRewardId: string
}

type ClaimPendingRewardUseCaseResponse = Either<
  ResourceNotFoundError | NotAllowedError | InvalidPendingRewardError,
  { pending: PendingReward; granted: GrantedEventReward }
>

/**
 * Retira um prêmio da caixa de recompensas (D155, `events_brief.md` 4.4): precisa de espaço no inventário e estar no
 * prazo. Sem espaço, o jogador abre espaço (vende, descarta) ou descarta o prêmio.
 */
export class ClaimPendingRewardUseCase {
  constructor(
    private pendingRewardsRepository: PendingRewardsRepository,
    private accountsRepository: AccountsRepository,
    private catalogRepository: CatalogRepository,
    private rewardsDeps: EventRewardsDeps,
    private clock: Clock
  ) {}

  async execute({
    accountId,
    pendingRewardId,
  }: ClaimPendingRewardUseCaseRequest): Promise<ClaimPendingRewardUseCaseResponse> {
    const pending =
      await this.pendingRewardsRepository.findById(pendingRewardId)
    if (!pending) return left(new ResourceNotFoundError('recompensa pendente'))
    if (pending.accountId.toString() !== accountId) {
      return left(new NotAllowedError())
    }

    const now = this.clock.now()
    const claimable = pending.checkClaimable(now)
    if (claimable.isLeft()) return left(claimable.value)

    const [account, used, wallet] = await Promise.all([
      this.accountsRepository.findById(accountId),
      inventoryUsage(
        this.rewardsDeps.gearRepository,
        this.rewardsDeps.beastsRepository,
        accountId
      ),
      this.rewardsDeps.walletsRepository.findByAccountId(accountId),
    ])
    if (!account) return left(new ResourceNotFoundError('conta'))
    if (used >= wallet.inventorySlots) {
      return left(
        new InvalidPendingRewardError(
          `o inventário está cheio (${used} de ${wallet.inventorySlots}): abra espaço ou descarte`
        )
      )
    }

    // retirada dupla ao mesmo tempo: só a primeira entrega
    if (!(await this.pendingRewardsRepository.delete(pending))) {
      return left(new ResourceNotFoundError('recompensa pendente'))
    }

    const [granted] = await grantEventRewards(
      {
        account,
        eventId: pending.eventId,
        refId: pending.id.toString(),
        rewards: [pending.reward],
        catalog: await this.catalogRepository.load(),
        now,
      },
      this.rewardsDeps
    )

    return right({ pending, granted })
  }
}
