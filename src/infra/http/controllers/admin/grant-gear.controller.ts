import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common'
import { z } from 'zod'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { GrantGearUseCase } from '@/domain/gear/applications/use-cases/grant-gear'
import { Admin } from '@/infra/auth/admin'
import { economyHttpError } from '../../economy-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { GearPresenter } from '../../presenters/gear-presenter'
import { catalogKeySchema } from '../../schemas/catalog'
import { usernameParamSchema } from '../../schemas/common'

const grantGearBodySchema = z.object({ gearKey: catalogKeySchema })

type GrantGearBodySchema = z.infer<typeof grantGearBodySchema>

/** POST /admin/accounts/:username/gear — dá um equipamento vivo a uma conta (entra guardado; precisa de espaço). */
@Controller('admin/accounts')
@Admin()
export class GrantGearController {
  constructor(
    private grantGear: GrantGearUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Post(':username/gear')
  @HttpCode(201)
  async handle(
    @Param('username', new ZodValidationPipe(usernameParamSchema))
    username: string,
    @Body(new ZodValidationPipe(grantGearBodySchema)) body: GrantGearBodySchema
  ) {
    const result = await this.grantGear.execute({ username, ...body })

    if (result.isLeft()) throw economyHttpError(result.value)

    const catalog = await this.catalogRepository.load()

    return { gear: GearPresenter.toHTTP(result.value.gear, catalog) }
  }
}
