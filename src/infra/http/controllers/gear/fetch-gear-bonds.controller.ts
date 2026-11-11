import { Controller, Get, Param } from '@nestjs/common'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { FetchGearBondsUseCase } from '@/domain/gear/applications/use-cases/fetch-gear-bonds'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { economyHttpError } from '../../economy-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { GearPresenter } from '../../presenters/gear-presenter'
import { uuidParamSchema } from '../../schemas/common'

/** GET /gear/:id/bonds — o elo do equipamento com cada personagem da conta (para escolher quem usa). */
@Controller('gear')
export class FetchGearBondsController {
  constructor(
    private fetchGearBonds: FetchGearBondsUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Get(':id/bonds')
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) gearId: string,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.fetchGearBonds.execute({
      accountId: user.sub,
      gearId,
    })

    if (result.isLeft()) throw economyHttpError(result.value)

    const catalog = await this.catalogRepository.load()
    const template = catalog.gearTemplates.get(
      result.value.gear.templateId.toValue()
    )!

    return {
      gear: GearPresenter.toHTTP(result.value.gear, catalog),
      bonds: result.value.bonds.map(({ character }) =>
        GearPresenter.bond(template, character, catalog)
      ),
    }
  }
}
