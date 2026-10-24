import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  Post,
} from '@nestjs/common'
import { z } from 'zod'
import { ResourceAlreadyExistsError } from '@/core/errors/err/resource-already-exists-error'
import { CreateAccountUseCase } from '@/domain/accounts/applications/use-cases/create-account'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { AccountPresenter } from '../../presenters/account-presenter'

// só o formato do corpo; as regras do username e do nome ficam no domínio (`Account.create`)
const createAccountBodySchema = z.object({
  username: z.string(),
  displayName: z.string(),
})

type CreateAccountBodySchema = z.infer<typeof createAccountBodySchema>

/** POST /accounts */
@Controller('accounts')
export class CreateAccountController {
  constructor(private createAccount: CreateAccountUseCase) {}

  @Post()
  @HttpCode(201)
  async handle(
    @Body(new ZodValidationPipe(createAccountBodySchema))
    body: CreateAccountBodySchema
  ) {
    const result = await this.createAccount.execute(body)

    if (result.isLeft()) {
      const error = result.value

      switch (error.constructor) {
        case ResourceAlreadyExistsError:
          throw new ConflictException(error.message)
        default:
          throw new BadRequestException(error.message)
      }
    }

    return { account: AccountPresenter.toHTTP(result.value.account) }
  }
}
