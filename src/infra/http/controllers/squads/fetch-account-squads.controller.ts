import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
} from '@nestjs/common'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { FetchAccountSquadsUseCase } from '@/domain/squads/applications/use-cases/fetch-account-squads'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { SquadPresenter } from '../../presenters/squad-presenter'
import { usernameParamSchema } from '../../schemas/common'

/** GET /accounts/:username/squads */
@Controller('accounts/:username/squads')
export class FetchAccountSquadsController {
  constructor(private fetchAccountSquads: FetchAccountSquadsUseCase) {}

  @Get()
  async handle(
    @Param('username', new ZodValidationPipe(usernameParamSchema))
    username: string
  ) {
    const result = await this.fetchAccountSquads.execute({ username })

    if (result.isLeft()) {
      const error = result.value

      switch (error.constructor) {
        case ResourceNotFoundError:
          throw new NotFoundException(error.message)
        default:
          throw new BadRequestException(error.message)
      }
    }

    return { squads: result.value.squads.map(SquadPresenter.toHTTP) }
  }
}
