import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Clock } from '@/core/gateways/clock'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { Account } from '@/domain/accounts/entities/account'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { WalletsRepository } from '@/domain/economy/applications/repositories/wallets-repository'
import { inventoryUsage } from '@/domain/economy/applications/services/inventory-usage'
import { GearRepository } from '@/domain/gear/applications/repositories/gear-repository'
import { Beast } from '../../entities/beast'
import { BeastSource } from '../../enums/beast-source'
import { InvalidBeastError } from '../../errors/invalid-beast-error'
import { BeastsRepository } from '../repositories/beasts-repository'

interface GrantBeastUseCaseRequest {
  username: string
  beastKey: string
}

type GrantBeastUseCaseResponse = Either<
  ResourceNotFoundError | InvalidBeastError,
  { beast: Beast }
>

/**
 * Admin dá uma besta a uma conta (D64: no MVP as bestas vêm de eventos, e o evento é o admin). Entra sem contrato e
 * precisa de espaço no inventário.
 */
export class GrantBeastUseCase {
  constructor(
    private accountsRepository: AccountsRepository,
    private beastsRepository: BeastsRepository,
    private gearRepository: GearRepository,
    private walletsRepository: WalletsRepository,
    private catalogRepository: CatalogRepository,
    private clock: Clock
  ) {}

  async execute({
    username,
    beastKey,
  }: GrantBeastUseCaseRequest): Promise<GrantBeastUseCaseResponse> {
    const account = await this.accountsRepository.findByUsername(
      Account.normalizeUsername(username)
    )
    if (!account) return left(new ResourceNotFoundError('conta'))

    const catalog = await this.catalogRepository.load()
    const template = [...catalog.beastTemplates.values()].find(
      (b) => b.key === beastKey
    )
    if (!template) return left(new ResourceNotFoundError('besta'))

    const accountId = account.id.toString()
    const [used, wallet] = await Promise.all([
      inventoryUsage(this.gearRepository, this.beastsRepository, accountId),
      this.walletsRepository.findByAccountId(accountId),
    ])
    if (used >= wallet.inventorySlots) {
      return left(
        new InvalidBeastError(
          `o inventário está cheio (${used} de ${wallet.inventorySlots})`
        )
      )
    }

    const beast = Beast.create({
      accountId: account.id,
      templateId: template.id,
      source: BeastSource.ADMIN,
      acquiredAt: this.clock.now(),
    })
    await this.beastsRepository.create(beast)

    return right({ beast })
  }
}
