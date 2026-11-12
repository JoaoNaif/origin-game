import { Controller, Get, Param } from '@nestjs/common'
import { FetchBeastRequirementsUseCase } from '@/domain/beasts/applications/use-cases/fetch-beast-requirements'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { economyHttpError } from '../../economy-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { BeastPresenter } from '../../presenters/beast-presenter'
import { uuidParamSchema } from '../../schemas/common'

/**
 * GET /beasts/:id/requirements — os requisitos do contrato Mestre com cada personagem da conta (vazio na Dominância e
 * na Igualdade, que não pedem nada).
 */
@Controller('beasts')
export class FetchBeastRequirementsController {
  constructor(
    private fetchBeastRequirements: FetchBeastRequirementsUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Get(':id/requirements')
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) beastId: string,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.fetchBeastRequirements.execute({
      accountId: user.sub,
      beastId,
    })

    if (result.isLeft()) throw economyHttpError(result.value)

    const catalog = await this.catalogRepository.load()
    const template = catalog.beastTemplates.get(
      result.value.beast.templateId.toValue()
    )!

    return {
      beast: BeastPresenter.toHTTP(result.value.beast, catalog),
      requirements: result.value.requirements.map(({ character }) =>
        BeastPresenter.requirements(template, character, catalog)
      ),
    }
  }
}
