import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common'
import { z } from 'zod'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { CreateSquadUseCase } from '@/domain/squads/applications/use-cases/create-squad'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { SquadPresenter } from '../../presenters/squad-presenter'
import { usernameParamSchema } from '../../schemas/common'
import { squadMembersSchema } from '../../schemas/squad-members'

const createSquadBodySchema = z.object({
  name: z.string(),
  members: squadMembersSchema,
})

type CreateSquadBodySchema = z.infer<typeof createSquadBodySchema>

/** POST /accounts/:username/squads */
@Controller('accounts/:username/squads')
export class CreateSquadController {
  constructor(private createSquad: CreateSquadUseCase) {}

  @Post()
  @HttpCode(201)
  async handle(
    @Param('username', new ZodValidationPipe(usernameParamSchema))
    username: string,
    @Body(new ZodValidationPipe(createSquadBodySchema))
    body: CreateSquadBodySchema
  ) {
    const result = await this.createSquad.execute({ username, ...body })

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
