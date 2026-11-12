import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common'
import { z } from 'zod'
import { GrantBeastUseCase } from '@/domain/beasts/applications/use-cases/grant-beast'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Admin } from '@/infra/auth/admin'
import { economyHttpError } from '../../economy-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { BeastPresenter } from '../../presenters/beast-presenter'
import { catalogKeySchema } from '../../schemas/catalog'
import { usernameParamSchema } from '../../schemas/common'

const grantBeastBodySchema = z.object({ beastKey: catalogKeySchema })

type GrantBeastBodySchema = z.infer<typeof grantBeastBodySchema>

/** POST /admin/accounts/:username/beasts — dá uma besta a uma conta (o "evento" do MVP); entra sem contrato. */
@Controller('admin/accounts')
@Admin()
export class GrantBeastController {
  constructor(
    private grantBeast: GrantBeastUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Post(':username/beasts')
  @HttpCode(201)
  async handle(
    @Param('username', new ZodValidationPipe(usernameParamSchema))
    username: string,
    @Body(new ZodValidationPipe(grantBeastBodySchema))
    body: GrantBeastBodySchema
  ) {
    const result = await this.grantBeast.execute({ username, ...body })

    if (result.isLeft()) throw economyHttpError(result.value)

    const catalog = await this.catalogRepository.load()

    return { beast: BeastPresenter.toHTTP(result.value.beast, catalog) }
  }
}
