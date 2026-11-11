import { Either, left, right } from '@/core/either'
import { Wallet } from '../../entities/wallet'
import { InsufficientFundsError } from '../../errors/insufficient-funds-error'
import { InvalidEconomyActionError } from '../../errors/invalid-economy-action-error'
import { WalletConflictError } from '../../errors/wallet-conflict-error'
import { WalletsRepository } from '../repositories/wallets-repository'

interface BuyInventorySlotsUseCaseRequest {
  accountId: string
}

type BuyInventorySlotsUseCaseResponse = Either<
  InvalidEconomyActionError | InsufficientFundsError | WalletConflictError,
  { wallet: Wallet; price: number }
>

/** Compra +5 espaços no inventário (D100, 3.2): 300, 600, 1.000, 1.500, 2.000 M e +500 M a cada compra, até 100. */
export class BuyInventorySlotsUseCase {
  constructor(private walletsRepository: WalletsRepository) {}

  async execute({
    accountId,
  }: BuyInventorySlotsUseCaseRequest): Promise<BuyInventorySlotsUseCaseResponse> {
    const wallet = await this.walletsRepository.findByAccountId(accountId)
    const bought = wallet.expandInventory()
    if (bought.isLeft()) return left(bought.value)

    if (!(await this.walletsRepository.save(wallet))) {
      return left(new WalletConflictError())
    }

    return right({ wallet, price: bought.value.price })
  }
}
