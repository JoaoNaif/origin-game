import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Request } from 'express'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { z } from 'zod'
import { EnvService } from '../env/env.service'
import { ACCESS_TOKEN_COOKIE } from '../http/auth-cookies'

export const tokenPayloadSchema = z.object({
  sub: z.string().uuid(),
})

/** Quem está logado: `sub` é o id da conta. */
export type AccountPayload = z.infer<typeof tokenPayloadSchema>

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(env: EnvService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // primeiro o cookie httpOnly (o front); depois o header Authorization (Postman, testes)
        (request: Request) => request?.cookies?.[ACCESS_TOKEN_COOKIE] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: Buffer.from(env.get('JWT_PUBLIC_KEY'), 'base64'),
      algorithms: ['RS256'],
    })
  }

  // só chega aqui com assinatura e validade já conferidas
  async validate(payload: unknown): Promise<AccountPayload> {
    const parsed = tokenPayloadSchema.safeParse(payload)
    if (!parsed.success) throw new UnauthorizedException()

    return parsed.data
  }
}
