import { Body, Controller, Param, Put } from '@nestjs/common'
import { z } from 'zod'
import { MoveBeastSlotUseCase } from '@/domain/beasts/applications/use-cases/move-beast-slot'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { economyHttpError } from '../../economy-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { BeastPresenter } from '../../presenters/beast-presenter'
import { uuidParamSchema } from '../../schemas/common'

const moveBeastSlotBodySchema = z.object({ slot: z.number().int() })

type MoveBeastSlotBodySchema = z.infer<typeof moveBeastSlotBodySchema>

/** PUT /beasts/:id/slot — troca o slot da build que a invocação ocupa (o contrato não muda). */
@Controller('beasts')
export class MoveBeastSlotController {
  constructor(
    private moveBeastSlot: MoveBeastSlotUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Put(':id/slot')
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) beastId: string,
    @Body(new ZodValidationPipe(moveBeastSlotBodySchema))
    body: MoveBeastSlotBodySchema,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.moveBeastSlot.execute({
      accountId: user.sub,
      beastId,
      slot: body.slot,
    })

    if (result.isLeft()) throw economyHttpError(result.value)

    const catalog = await this.catalogRepository.load()

    return { beast: BeastPresenter.toHTTP(result.value.beast, catalog) }
  }
}
