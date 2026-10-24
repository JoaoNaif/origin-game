import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  Put,
} from '@nestjs/common'
import { z } from 'zod'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { UpdateSquadFormationUseCase } from '@/domain/squads/applications/use-cases/update-squad-formation'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
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

/** PUT /squads/:id/formation — só da conta logada. */
@Controller('squads')
export class UpdateSquadFormationController {
  constructor(private updateSquadFormation: UpdateSquadFormationUseCase) {}

  @Put(':id/formation')
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) squadId: string,
    @Body(new ZodValidationPipe(updateSquadFormationBodySchema))
    body: UpdateSquadFormationBodySchema,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.updateSquadFormation.execute({
      squadId,
      accountId: user.sub,
      members: body.members,
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

    return { squad: SquadPresenter.toHTTP(result.value.squad) }
  }
}
