import { Controller, HttpCode, Param, Post } from '@nestjs/common'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { UnequipGearUseCase } from '@/domain/gear/applications/use-cases/unequip-gear'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { economyHttpError } from '../../economy-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { GearPresenter } from '../../presenters/gear-presenter'
import { uuidParamSchema } from '../../schemas/common'

/** POST /gear/:id/unequip — tira o equipamento do personagem; ele volta para o inventário. */
@Controller('gear')
export class UnequipGearController {
  constructor(
    private unequipGear: UnequipGearUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Post(':id/unequip')
  @HttpCode(200)
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) gearId: string,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.unequipGear.execute({
      accountId: user.sub,
      gearId,
    })

    if (result.isLeft()) throw economyHttpError(result.value)

    const catalog = await this.catalogRepository.load()

    return { gear: GearPresenter.toHTTP(result.value.gear, catalog) }
  }
}
