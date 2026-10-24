import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Param,
  Put,
} from '@nestjs/common'
import { z } from 'zod'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { UpdateSquadFormationUseCase } from '@/domain/squads/applications/use-cases/update-squad-formation'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { SquadPresenter } from '../../presenters/squad-presenter'
import { uuidParamSchema } from '../../schemas/common'
import { squadMembersSchema } from '../../schemas/squad-members'

const updateSquadFormationBodySchema = z.object({
  members: squadMembersSchema,
})

type UpdateSquadFormationBodySchema = z.infer<
  typeof updateSquadFormationBodySchema
>

/** PUT /squads/:id/formation */
@Controller('squads')
export class UpdateSquadFormationController {
  constructor(private updateSquadFormation: UpdateSquadFormationUseCase) {}

  @Put(':id/formation')
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) squadId: string,
    @Body(new ZodValidationPipe(updateSquadFormationBodySchema))
    body: UpdateSquadFormationBodySchema
  ) {
    const result = await this.updateSquadFormation.execute({
      squadId,
      members: body.members,
    })

    if (result.isLeft()) {
      const error = result.value

      switch (error.constructor) {
        case ResourceNotFoundError:
          throw new NotFoundException(error.message)
        default:
          throw new BadRequestException(error.message)
      }
    }

    return { squad: SquadPresenter.toHTTP(result.value.squad) }
  }
}
