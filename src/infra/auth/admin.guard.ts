import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { AccountPayload } from './jwt-strategy'

/**
 * Só deixa passar admin. Roda depois do guard global (que já validou o JWT) e lê o papel **no banco** a cada
 * requisição, não no token: quem é rebaixado perde o acesso na hora, sem esperar o token vencer.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private accountsRepository: AccountsRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const user = context.switchToHttp().getRequest().user as
      AccountPayload | undefined
    if (!user) throw new UnauthorizedException()

    const account = await this.accountsRepository.findById(user.sub)
    if (!account?.isAdmin) {
      throw new ForbiddenException('Só admin.')
    }

    return true
  }
}
