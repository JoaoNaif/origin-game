import { Either, left, right } from '@/core/either'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Clock } from '@/core/gateways/clock'
import { Rarity } from '@/domain/characters/enums/rarity'
import { CHEST_PRICE } from '../../economy-values'
import { Chest } from '../../entities/chest'
import { Wallet } from '../../entities/wallet'
import { ChestSource } from '../../enums/chest-source'
import { WalletReason } from '../../enums/wallet-reason'
import { InsufficientFundsError } from '../../errors/insufficient-funds-error'
import { InvalidEconomyActionError } from '../../errors/invalid-economy-action-error'
import { WalletConflictError } from '../../errors/wallet-conflict-error'
import { ChestsRepository } from '../repositories/chests-repository'
import { WalletsRepository } from '../repositories/wallets-repository'

interface BuyChestUseCaseRequest {
  accountId: string
  tier: Rarity
}

type BuyChestUseCaseResponse = Either<
  InvalidEconomyActionError | InsufficientFundsError | WalletConflictError,
  { chest: Chest; wallet: Wallet }
>

/** Compra um baú com moeda (3.5): só os básicos (E 300, D 1.000, C 3.500 M). Ele chega fechado. */
export class BuyChestUseCase {
  constructor(
    private walletsRepository: WalletsRepository,
    private chestsRepository: ChestsRepository,
    private clock: Clock
  ) {}

  async execute({
    accountId,
    tier,
  }: BuyChestUseCaseRequest): Promise<BuyChestUseCaseResponse> {
    const price = CHEST_PRICE[tier]
    if (price === undefined) {
      return left(
        new InvalidEconomyActionError(
          `o baú ${tier} não se compra (vem de eventos, ranqueado e missões)`
        )
      )
    }

    const chest = Chest.create({
      accountId: new UniqueEntityId(accountId),
      tier,
      source: ChestSource.PURCHASE,
      createdAt: this.clock.now(),
    })

    const wallet = await this.walletsRepository.findByAccountId(accountId)
    const spent = wallet.spend({
      reason: WalletReason.CHEST_PURCHASE,
      refId: chest.id.toString(),
      coins: price,
    })
    if (spent.isLeft()) return left(spent.value)

    // a moeda sai primeiro: no conflito nada foi gasto e o baú não existe
    if (!(await this.walletsRepository.save(wallet))) {
      return left(new WalletConflictError())
    }
    await this.chestsRepository.create(chest)

    return right({ chest, wallet })
  }
}
