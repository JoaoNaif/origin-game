import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  NotFoundException,
  Post,
} from '@nestjs/common'
import { z } from 'zod'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { CreateSquadUseCase } from '@/domain/squads/applications/use-cases/create-squad'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { SquadPresenter } from '../../presenters/squad-presenter'
import { squadMembersSchema } from '../../schemas/squad-members'

const createSquadBodySchema = z.object({
  name: z.string(),
  members: squadMembersSchema,
})

type CreateSquadBodySchema = z.infer<typeof createSquadBodySchema>

/** POST /me/squads — salva uma formação da conta logada. */
@Controller('me/squads')
export class CreateSquadController {
  constructor(private createSquad: CreateSquadUseCase) {}

  @Post()
  @HttpCode(201)
  async handle(
    @Body(new ZodValidationPipe(createSquadBodySchema))
    body: CreateSquadBodySchema,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.createSquad.execute({
      accountId: user.sub,
      ...body,
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
