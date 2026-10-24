import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
} from '@nestjs/common'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { GetCurrentAccountUseCase } from '@/domain/accounts/applications/use-cases/get-current-account'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { AccountPresenter } from '../../presenters/account-presenter'

/** GET /me — a conta logada (é o que o front lê depois do login). */
@Controller('me')
export class GetCurrentAccountController {
  constructor(private getCurrentAccount: GetCurrentAccountUseCase) {}

  @Get()
  async handle(@CurrentUser() user: AccountPayload) {
    const result = await this.getCurrentAccount.execute({ accountId: user.sub })

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
