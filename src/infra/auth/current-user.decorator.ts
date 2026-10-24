import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { AccountPayload } from './jwt-strategy'

/** A conta logada (`sub` = id da conta), lida do token pelo `JwtStrategy`. */
export const CurrentUser = createParamDecorator(
  (_: never, context: ExecutionContext) =>
    context.switchToHttp().getRequest().user as AccountPayload
)
