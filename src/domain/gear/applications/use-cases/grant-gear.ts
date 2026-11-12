import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Clock } from '@/core/gateways/clock'
import { BeastsRepository } from '@/domain/beasts/applications/repositories/beasts-repository'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { Account } from '@/domain/accounts/entities/account'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { WalletsRepository } from '@/domain/economy/applications/repositories/wallets-repository'
import { inventoryUsage } from '@/domain/economy/applications/services/inventory-usage'
import { Gear } from '../../entities/gear'
import { GearSource } from '../../enums/gear-source'
import { InvalidGearError } from '../../errors/invalid-gear-error'
import { GearRepository } from '../repositories/gear-repository'

interface GrantGearUseCaseRequest {
  username: string
  gearKey: string
}

type GrantGearUseCaseResponse = Either<
  ResourceNotFoundError | InvalidGearError,
  { gear: Gear }
>

/** Admin dá um equipamento a uma conta (para testar, ou o Divino de um evento único, 9.6). Precisa de espaço livre. */
export class GrantGearUseCase {
  constructor(
    private accountsRepository: AccountsRepository,
    private gearRepository: GearRepository,
    private beastsRepository: BeastsRepository,
    private walletsRepository: WalletsRepository,
    private catalogRepository: CatalogRepository,
    private clock: Clock
  ) {}

  async execute({
    username,
    gearKey,
  }: GrantGearUseCaseRequest): Promise<GrantGearUseCaseResponse> {
    const account = await this.accountsRepository.findByUsername(
      Account.normalizeUsername(username)
    )
    if (!account) return left(new ResourceNotFoundError('conta'))

    const catalog = await this.catalogRepository.load()
    const template = [...catalog.gearTemplates.values()].find(
      (t) => t.key === gearKey
    )
    if (!template) return left(new ResourceNotFoundError('equipamento'))

    const accountId = account.id.toString()
    const [used, wallet] = await Promise.all([
      inventoryUsage(this.gearRepository, this.beastsRepository, accountId),
      this.walletsRepository.findByAccountId(accountId),
    ])
    if (used >= wallet.inventorySlots) {
      return left(
        new InvalidGearError(
          `o inventário está cheio (${used} de ${wallet.inventorySlots})`
        )
      )
    }

    const gear = Gear.create({
      accountId: account.id,
      templateId: template.id,
      source: GearSource.ADMIN,
      acquiredAt: this.clock.now(),
    })
    await this.gearRepository.create(gear)

    return right({ gear })
  }
}
