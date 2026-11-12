import { Controller, Get } from '@nestjs/common'
import { FetchAccountBeastsUseCase } from '@/domain/beasts/applications/use-cases/fetch-account-beasts'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { BeastPresenter } from '../../presenters/beast-presenter'

/** GET /me/beasts — as bestas da conta (D154), com e sem contrato. Os espaços do inventário estão em `/me/gear`. */
@Controller('me/beasts')
export class FetchAccountBeastsController {
  constructor(
    private fetchAccountBeasts: FetchAccountBeastsUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Get()
  async handle(@CurrentUser() user: AccountPayload) {
    const result = await this.fetchAccountBeasts.execute({
      accountId: user.sub,
    })
    const { beasts, holders } = result.value
    const catalog = await this.catalogRepository.load()

    return {
      beasts: beasts.map((b) =>
        BeastPresenter.toHTTP(
          b,
          catalog,
          holders.find((c) => b.characterId?.equals(c.id)) ?? null
        )
      ),
    }
  }
}
