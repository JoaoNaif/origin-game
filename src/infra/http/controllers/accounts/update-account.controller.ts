import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  NotFoundException,
  Patch,
  Res,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Response } from 'express'
import { z } from 'zod'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { UpdateAccountUseCase } from '@/domain/accounts/applications/use-cases/update-account'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { EnvService } from '@/infra/env/env.service'
import { setAuthCookies } from '../../auth-cookies'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { AccountPresenter } from '../../presenters/account-presenter'

// só o formato do corpo; as regras do nome e da senha ficam no domínio (`Account`)
const updateAccountBodySchema = z
  .object({
    displayName: z.string().optional(),
    currentPassword: z.string().optional(),
    newPassword: z.string().optional(),
  })
  .strict()

type UpdateAccountBodySchema = z.infer<typeof updateAccountBodySchema>

/**
 * PATCH /me — a conta logada muda o nome exibido e/ou a senha (esta com a senha atual). Trocar a senha derruba as
 * outras sessões e manda cookies novos para este aparelho.
 */
@Controller('me')
export class UpdateAccountController {
  constructor(
    private updateAccount: UpdateAccountUseCase,
    private env: EnvService
  ) {}

  // 5 por minuto por IP, como o login: segura força bruta da senha atual
  @Patch()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async handle(
    @Body(new ZodValidationPipe(updateAccountBodySchema))
    body: UpdateAccountBodySchema,
    @CurrentUser() user: AccountPayload,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.updateAccount.execute({
      ...body,
      accountId: user.sub,
      userAgent: userAgent ?? null,
    })

    if (result.isLeft()) {
      const error = result.value

      // senha atual errada é 400, não 401: com 401 o front tentaria o refresh e repetiria a requisição
      switch (error.constructor) {
        case ResourceNotFoundError:
          throw new NotFoundException(error.message)
        default:
          throw new BadRequestException(error.message)
      }
    }

    const { account, tokens } = result.value
    if (tokens) {
      setAuthCookies(res, tokens, this.env.get('NODE_ENV') === 'production')
    }

    return { account: AccountPresenter.toCurrentHTTP(account) }
  }
}
