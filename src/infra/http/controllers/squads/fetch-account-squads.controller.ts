import { Controller, Get } from '@nestjs/common'
import { FetchAccountSquadsUseCase } from '@/domain/squads/applications/use-cases/fetch-account-squads'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { SquadPresenter } from '../../presenters/squad-presenter'

/** GET /me/squads — as formações salvas da conta logada. */
@Controller('me/squads')
export class FetchAccountSquadsController {
  constructor(private fetchAccountSquads: FetchAccountSquadsUseCase) {}

  @Get()
  async handle(@CurrentUser() user: AccountPayload) {
    const result = await this.fetchAccountSquads.execute({
      accountId: user.sub,
    })

    return { squads: result.value.squads.map(SquadPresenter.toHTTP) }
  }
}
