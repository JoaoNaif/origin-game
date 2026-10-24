import {
  BadRequestException,
  Controller,
  Delete,
  HttpCode,
  NotFoundException,
  Param,
} from '@nestjs/common'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { DeleteSquadUseCase } from '@/domain/squads/applications/use-cases/delete-squad'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { uuidParamSchema } from '../../schemas/common'

/** DELETE /squads/:id */
@Controller('squads')
export class DeleteSquadController {
  constructor(private deleteSquad: DeleteSquadUseCase) {}

  @Delete(':id')
  @HttpCode(204)
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) squadId: string
  ) {
    const result = await this.deleteSquad.execute({ squadId })

    if (result.isLeft()) {
      const error = result.value

      switch (error.constructor) {
        case ResourceNotFoundError:
          throw new NotFoundException(error.message)
        default:
          throw new BadRequestException(error.message)
      }
    }
  }
}
