import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
} from '@nestjs/common'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { FetchAccountByUsernameUseCase } from '@/domain/accounts/applications/use-cases/fetch-account-by-username'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { AccountPresenter } from '../../presenters/account-presenter'
import { usernameParamSchema } from '../../schemas/common'

/** GET /accounts/:username */
@Controller('accounts')
export class FetchAccountByUsernameController {
  constructor(private fetchAccountByUsername: FetchAccountByUsernameUseCase) {}

  @Get(':username')
  async handle(
    @Param('username', new ZodValidationPipe(usernameParamSchema))
    username: string
  ) {
    const result = await this.fetchAccountByUsername.execute({ username })

    if (result.isLeft()) {
      const error = result.value

      switch (error.constructor) {
        case ResourceNotFoundError:
          throw new NotFoundException(error.message)
        default:
          throw new BadRequestException(error.message)
      }
    }

    return { account: AccountPresenter.toHTTP(result.value.account) }
  }
}
