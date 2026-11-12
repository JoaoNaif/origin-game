import { Controller, Get } from '@nestjs/common'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { FetchAccountGearUseCase } from '@/domain/gear/applications/use-cases/fetch-account-gear'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { GearPresenter } from '../../presenters/gear-presenter'

/**
 * GET /me/gear — o inventário da conta (D100, D153): os equipamentos vivos (com o elo de quem usa), os espaços usados
 * e o total, e o preço da próxima compra de +5 espaços.
 */
@Controller('me/gear')
export class FetchAccountGearController {
  constructor(
    private fetchAccountGear: FetchAccountGearUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Get()
  async handle(@CurrentUser() user: AccountPayload) {
    const result = await this.fetchAccountGear.execute({ accountId: user.sub })
    const { gear, used, holders, slots, nextExpansionPrice } = result.value
    const catalog = await this.catalogRepository.load()

    return {
      inventory: { used, slots, nextExpansionPrice },
      gear: gear.map((g) =>
        GearPresenter.toHTTP(
          g,
          catalog,
          holders.find((c) => g.characterId?.equals(c.id)) ?? null
        )
      ),
    }
  }
}
