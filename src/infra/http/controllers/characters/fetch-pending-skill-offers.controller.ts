import { Controller, Get } from '@nestjs/common'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { FetchPendingSkillOffersUseCase } from '@/domain/characters/applications/use-cases/fetch-pending-skill-offers'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { SkillOfferPresenter } from '../../presenters/skill-offer-presenter'

/** GET /me/skill-offers — os blocos de skill esperando escolha (D77, D135), do mais antigo para o mais novo. */
@Controller('me/skill-offers')
export class FetchPendingSkillOffersController {
  constructor(
    private fetchPendingSkillOffers: FetchPendingSkillOffersUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Get()
  async handle(@CurrentUser() user: AccountPayload) {
    const result = await this.fetchPendingSkillOffers.execute({
      accountId: user.sub,
    })
    const catalog = await this.catalogRepository.load()

    return {
      offers: result.value.offers.map((o) =>
        SkillOfferPresenter.toHTTP(o, catalog)
      ),
    }
  }
}
