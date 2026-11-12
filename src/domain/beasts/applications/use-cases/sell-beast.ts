import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { WalletsRepository } from '@/domain/economy/applications/repositories/wallets-repository'
import { creditWallet } from '@/domain/economy/applications/services/credit-wallet'
import { Wallet } from '@/domain/economy/entities/wallet'
import { WalletReason } from '@/domain/economy/enums/wallet-reason'
import { beastSaleValue } from '../../beast-values'
import { Beast } from '../../entities/beast'
import { InvalidBeastError } from '../../errors/invalid-beast-error'
import { BeastsRepository } from '../repositories/beasts-repository'
import { findOwnedBeast } from '../services/owned-beast'

interface SellBeastUseCaseRequest {
  accountId: string
  beastId: string
}

type SellBeastUseCaseResponse = Either<
  ResourceNotFoundError | NotAllowedError | InvalidBeastError,
  { beast: Beast; coins: number; wallet: Wallet }
>

/**
 * Vende ao sistema a besta **sem contrato** (progressão 3.3: o mesmo valor do equipamento pelo grau). A sagrada não se
 * vende; com contrato, só desfazendo (e aí ela se perde, sem moeda).
 */
export class SellBeastUseCase {
  constructor(
    private beastsRepository: BeastsRepository,
    private walletsRepository: WalletsRepository,
    private catalogRepository: CatalogRepository
  ) {}

  async execute({
    accountId,
    beastId,
  }: SellBeastUseCaseRequest): Promise<SellBeastUseCaseResponse> {
    const beast = await findOwnedBeast(
      this.beastsRepository,
      beastId,
      accountId
    )
    if (beast.isLeft()) return left(beast.value)

    if (beast.value.hasContract) {
      return left(
        new InvalidBeastError(
          'besta com contrato não se vende (desfazer o contrato a perde)'
        )
      )
    }

    const catalog = await this.catalogRepository.load()
    const template = catalog.beastTemplates.get(
      beast.value.templateId.toValue()
    )
    if (!template) return left(new ResourceNotFoundError('modelo da besta'))

    const coins = beastSaleValue(template.grade)
    if (coins === null) {
      return left(new InvalidBeastError('a besta sagrada não se vende'))
    }

    if (!(await this.beastsRepository.delete(beast.value))) {
      return left(new ResourceNotFoundError('besta'))
    }

    const wallet = await creditWallet(this.walletsRepository, accountId, {
      reason: WalletReason.BEAST_SALE,
      refId: beast.value.id.toString(),
      coins,
    })

    return right({ beast: beast.value, coins, wallet })
  }
}
