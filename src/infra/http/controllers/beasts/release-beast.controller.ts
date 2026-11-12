import { Controller, Delete, HttpCode, Param } from '@nestjs/common'
import { ReleaseBeastUseCase } from '@/domain/beasts/applications/use-cases/release-beast'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { economyHttpError } from '../../economy-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { uuidParamSchema } from '../../schemas/common'

/**
 * DELETE /beasts/:id — desfaz o contrato ou descarta a besta: ela é **perdida**, não volta ao inventário e não rende
 * nada (`progression_brief.md` 2.5). O front pede confirmação.
 */
@Controller('beasts')
export class ReleaseBeastController {
  constructor(private releaseBeast: ReleaseBeastUseCase) {}

  @Delete(':id')
  @HttpCode(204)
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) beastId: string,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.releaseBeast.execute({
      accountId: user.sub,
      beastId,
    })

    if (result.isLeft()) throw economyHttpError(result.value)
  }
}
