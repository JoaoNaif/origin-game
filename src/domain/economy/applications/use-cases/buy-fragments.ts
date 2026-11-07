import { Either, left, right } from '@/core/either'
import { Lineage } from '@/domain/characters/enums/lineage'
import { FRAGMENT_CAP, FRAGMENT_PRICE } from '../../economy-values'
import { Wallet } from '../../entities/wallet'
import { WalletReason } from '../../enums/wallet-reason'
import { InsufficientFundsError } from '../../errors/insufficient-funds-error'
import { InvalidEconomyActionError } from '../../errors/invalid-economy-action-error'
import { WalletConflictError } from '../../errors/wallet-conflict-error'
import { WalletsRepository } from '../repositories/wallets-repository'

interface BuyFragmentsUseCaseRequest {
  accountId: string
  type: Lineage
  amount: number
}

type BuyFragmentsUseCaseResponse = Either<
  InvalidEconomyActionError | InsufficientFundsError | WalletConflictError,
  { wallet: Wallet }
>

/** Compra fragmentos do sistema (3.9): 200 M cada, sem limite de compras, mas sem passar de 500 no tipo. */
export class BuyFragmentsUseCase {
  constructor(private walletsRepository: WalletsRepository) {}

  async execute({
    accountId,
    type,
    amount,
  }: BuyFragmentsUseCaseRequest): Promise<BuyFragmentsUseCaseResponse> {
    if (!Number.isInteger(amount) || amount < 1) {
      return left(
        new InvalidEconomyActionError('quantidade inteira, de 1 em diante')
      )
    }

    const wallet = await this.walletsRepository.findByAccountId(accountId)
    if (wallet.fragmentsOf(type) + amount > FRAGMENT_CAP) {
      return left(
        new InvalidEconomyActionError(
          `passa do limite de ${FRAGMENT_CAP} fragmentos ${type} (a conta tem ${wallet.fragmentsOf(type)})`
        )
      )
    }

    const spent = wallet.spend({
      reason: WalletReason.FRAGMENT_PURCHASE,
      coins: amount * FRAGMENT_PRICE.BUY,
    })
    if (spent.isLeft()) return left(spent.value)

    wallet.earn({
      reason: WalletReason.FRAGMENT_PURCHASE,
      fragments: { [type]: amount },
    })

    if (!(await this.walletsRepository.save(wallet))) {
      return left(new WalletConflictError())
    }

    return right({ wallet })
  }
}
