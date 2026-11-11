import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { WalletsRepository } from '@/domain/economy/applications/repositories/wallets-repository'
import { creditWallet } from '@/domain/economy/applications/services/credit-wallet'
import { Wallet } from '@/domain/economy/entities/wallet'
import { WalletReason } from '@/domain/economy/enums/wallet-reason'
import { Gear } from '../../entities/gear'
import { InvalidGearError } from '../../errors/invalid-gear-error'
import { gearSaleValue } from '../../gear-values'
import { GearRepository } from '../repositories/gear-repository'
import { findOwnedGear } from '../services/owned-gear'

interface SellGearUseCaseRequest {
  accountId: string
  gearId: string
}

type SellGearUseCaseResponse = Either<
  ResourceNotFoundError | NotAllowedError | InvalidGearError,
  { gear: Gear; coins: number; wallet: Wallet }
>

/**
 * Vende o equipamento ao sistema (`progression_brief.md` 2.5 e 3.3): vira moeda pelo valor do grau (Escudeiro ≈ E,
 * Cavaleiro ≈ C, Mestre ≈ A, Rei ≈ SS). O Divino é da conta e não se vende (9.6). Equipado, tira do personagem antes.
 */
export class SellGearUseCase {
  constructor(
    private gearRepository: GearRepository,
    private walletsRepository: WalletsRepository,
    private catalogRepository: CatalogRepository
  ) {}

  async execute({
    accountId,
    gearId,
  }: SellGearUseCaseRequest): Promise<SellGearUseCaseResponse> {
    const gear = await findOwnedGear(this.gearRepository, gearId, accountId)
    if (gear.isLeft()) return left(gear.value)

    if (gear.value.isEquipped) {
      return left(
        new InvalidGearError('tire o equipamento do personagem antes de vender')
      )
    }

    const catalog = await this.catalogRepository.load()
    const template = catalog.gearTemplates.get(gear.value.templateId.toValue())
    if (!template) {
      return left(new ResourceNotFoundError('modelo do equipamento'))
    }

    const coins = gearSaleValue(template.grade)
    if (coins === null) {
      return left(new InvalidGearError('o Divino é da conta e não se vende'))
    }

    // some primeiro: vendido duas vezes ao mesmo tempo, só a primeira paga
    if (!(await this.gearRepository.delete(gear.value))) {
      return left(new ResourceNotFoundError('equipamento'))
    }

    const wallet = await creditWallet(this.walletsRepository, accountId, {
      reason: WalletReason.GEAR_SALE,
      refId: gear.value.id.toString(),
      coins,
    })

    return right({ gear: gear.value, coins, wallet })
  }
}
