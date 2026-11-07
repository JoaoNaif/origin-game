import { Either, left, right } from '@/core/either'
import { Lineage } from '@/domain/characters/enums/lineage'
import { FRAGMENT_PRICE } from '../../economy-values'
import { Wallet } from '../../entities/wallet'
import { WalletReason } from '../../enums/wallet-reason'
import { InsufficientFundsError } from '../../errors/insufficient-funds-error'
import { InvalidEconomyActionError } from '../../errors/invalid-economy-action-error'
import { WalletConflictError } from '../../errors/wallet-conflict-error'
import { WalletsRepository } from '../repositories/wallets-repository'

interface SellFragmentsUseCaseRequest {
  accountId: string
  type: Lineage
  amount: number
}

type SellFragmentsUseCaseResponse = Either<
  InvalidEconomyActionError | InsufficientFundsError | WalletConflictError,
  { wallet: Wallet }
>

/** Vende fragmentos ao sistema (3.9): 40 M cada. */
export class SellFragmentsUseCase {
  constructor(private walletsRepository: WalletsRepository) {}

  async execute({
    accountId,
    type,
    amount,
  }: SellFragmentsUseCaseRequest): Promise<SellFragmentsUseCaseResponse> {
    if (!Number.isInteger(amount) || amount < 1) {
      return left(
        new InvalidEconomyActionError('quantidade inteira, de 1 em diante')
      )
    }

    const wallet = await this.walletsRepository.findByAccountId(accountId)
    const spent = wallet.spend({
      reason: WalletReason.FRAGMENT_SALE,
      fragments: { [type]: amount },
    })
    if (spent.isLeft()) return left(spent.value)

    wallet.earn({
      reason: WalletReason.FRAGMENT_SALE,
      coins: amount * FRAGMENT_PRICE.SELL,
    })

    if (!(await this.walletsRepository.save(wallet))) {
      return left(new WalletConflictError())
    }

    return right({ wallet })
  }
}
