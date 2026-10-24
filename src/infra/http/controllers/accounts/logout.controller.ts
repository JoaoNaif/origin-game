import { Controller, Delete, HttpCode, Req, Res } from '@nestjs/common'
import { Request, Response } from 'express'
import { LogoutUseCase } from '@/domain/accounts/applications/use-cases/logout'
import { Public } from '@/infra/auth/public'
import { EnvService } from '@/infra/env/env.service'
import { clearAuthCookies, REFRESH_TOKEN_COOKIE } from '../../auth-cookies'

/**
 * DELETE /sessions — sai. Pública: precisa funcionar com o token de acesso já vencido. Sem cookie também responde
 * 204 (sair duas vezes dá certo).
 */
@Controller('sessions')
@Public()
export class LogoutController {
  constructor(
    private logout: LogoutUseCase,
    private env: EnvService
  ) {}

  @Delete()
  @HttpCode(204)
  async handle(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken: unknown = req.cookies?.[REFRESH_TOKEN_COOKIE]

    if (typeof refreshToken === 'string' && refreshToken) {
      await this.logout.execute({ refreshToken })
    }

    clearAuthCookies(res, this.env.get('NODE_ENV') === 'production')
  }
}
