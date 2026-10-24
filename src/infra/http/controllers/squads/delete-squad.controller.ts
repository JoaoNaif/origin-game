import {
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
  HttpCode,
  NotFoundException,
  Param,
} from '@nestjs/common'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { DeleteSquadUseCase } from '@/domain/squads/applications/use-cases/delete-squad'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { uuidParamSchema } from '../../schemas/common'

/** DELETE /squads/:id — só da conta logada. */
@Controller('squads')
export class DeleteSquadController {
  constructor(private deleteSquad: DeleteSquadUseCase) {}

  @Delete(':id')
  @HttpCode(204)
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) squadId: string,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.deleteSquad.execute({
      squadId,
      accountId: user.sub,
    })

    if (result.isLeft()) {
      const error = result.value

      switch (error.constructor) {
        case ResourceNotFoundError:
          throw new NotFoundException(error.message)
        case NotAllowedError:
          throw new ForbiddenException(error.message)
        default:
          throw new BadRequestException(error.message)
      }
    }
  }
}
