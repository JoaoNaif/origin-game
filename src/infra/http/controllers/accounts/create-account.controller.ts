import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  Post,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { z } from 'zod'
import { ResourceAlreadyExistsError } from '@/core/errors/err/resource-already-exists-error'
import { CreateAccountUseCase } from '@/domain/accounts/applications/use-cases/create-account'
import { Public } from '@/infra/auth/public'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { AccountPresenter } from '../../presenters/account-presenter'

// só o formato do corpo; as regras do username, do nome e da senha ficam no domínio (`Account`)
const createAccountBodySchema = z.object({
  username: z.string(),
  displayName: z.string(),
  password: z.string(),
})

type CreateAccountBodySchema = z.infer<typeof createAccountBodySchema>

/** POST /accounts — cadastro (público). Para entrar depois: POST /sessions. */
@Controller('accounts')
@Public()
export class CreateAccountController {
  constructor(private createAccount: CreateAccountUseCase) {}

  // 5 cadastros por minuto por IP: evita criação de contas em massa
  @Post()
  @HttpCode(201)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
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
