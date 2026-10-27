import { Controller, Get } from '@nestjs/common'
import { FetchAccountsUseCase } from '@/domain/accounts/applications/use-cases/fetch-accounts'
import { Admin } from '@/infra/auth/admin'
import { AccountPresenter } from '../../presenters/account-presenter'

/** GET /admin/accounts — todas as contas, pelo username, com o papel e quantos personagens e batalhas têm. */
@Controller('admin/accounts')
@Admin()
export class FetchAccountsController {
  constructor(private fetchAccounts: FetchAccountsUseCase) {}

  @Get()
  async handle() {
    const result = await this.fetchAccounts.execute()

    return {
      accounts: result.value.accounts.map(
        ({ account, characters, battles }) => ({
          ...AccountPresenter.toCurrentHTTP(account),
          characters,
          battles,
        })
      ),
    }
  }
}
