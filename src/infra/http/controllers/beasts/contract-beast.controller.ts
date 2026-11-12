import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common'
import { z } from 'zod'
import { ContractBeastUseCase } from '@/domain/beasts/applications/use-cases/contract-beast'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { economyHttpError } from '../../economy-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { BeastPresenter } from '../../presenters/beast-presenter'
import { uuidParamSchema } from '../../schemas/common'

const contractBeastBodySchema = z.object({
  characterId: uuidParamSchema,
  slot: z.number().int(),
})

type ContractBeastBodySchema = z.infer<typeof contractBeastBodySchema>

/**
 * POST /beasts/:id/contract — firma o contrato com um personagem; a invocação passa a ocupar o slot dado da build
 * (D154). Uma vez só: desfazer o contrato perde a besta.
 */
@Controller('beasts')
export class ContractBeastController {
  constructor(
    private contractBeast: ContractBeastUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Post(':id/contract')
  @HttpCode(200)
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) beastId: string,
    @Body(new ZodValidationPipe(contractBeastBodySchema))
    body: ContractBeastBodySchema,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.contractBeast.execute({
      accountId: user.sub,
      beastId,
      ...body,
    })

    if (result.isLeft()) throw economyHttpError(result.value)

    const catalog = await this.catalogRepository.load()

    return {
      beast: BeastPresenter.toHTTP(
        result.value.beast,
        catalog,
        result.value.character
      ),
    }
  }
}
