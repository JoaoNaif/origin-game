import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Res,
  UnauthorizedException,
} from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { Response } from 'express'
import { z } from 'zod'
import { WrongCredentialsError } from '@/domain/accounts/applications/errors/wrong-credentials-error'
import { AuthenticateUseCase } from '@/domain/accounts/applications/use-cases/authenticate'
import { Public } from '@/infra/auth/public'
import { EnvService } from '@/infra/env/env.service'
import { setAuthCookies } from '../../auth-cookies'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'

const authenticateBodySchema = z.object({
  username: z.string(),
  password: z.string(),
})

type AuthenticateBodySchema = z.infer<typeof authenticateBodySchema>

/** POST /sessions — login. Os tokens saem só em cookies httpOnly; a conta se lê em GET /me. */
@Controller('sessions')
@Public()
export class AuthenticateController {
  constructor(
    private authenticate: AuthenticateUseCase,
    private env: EnvService
  ) {}

  // 5 tentativas por minuto por IP: segura força bruta de senha
  @Post()
  @HttpCode(204)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async handle(
    @Body(new ZodValidationPipe(authenticateBodySchema))
    body: AuthenticateBodySchema,
    @Headers('user-agent') userAgent: string | undefined,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authenticate.execute({
      ...body,
      userAgent: userAgent ?? null,
    })

    if (result.isLeft()) {
      const error = result.value

      switch (error.constructor) {
        case WrongCredentialsError:
          throw new UnauthorizedException(error.message)
        default:
          throw new BadRequestException(error.message)
      }
    }

    setAuthCookies(res, result.value, this.env.get('NODE_ENV') === 'production')
  }
}
