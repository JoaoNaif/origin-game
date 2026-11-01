import { Controller, Get } from '@nestjs/common'
import { Public } from '@/infra/auth/public'
import { FormationBonusesPresenter } from '../../presenters/formation-bonuses-presenter'

/** GET /formation-bonuses — valores dos bônus de formação (D128), lidos das constantes do motor. */
@Controller('formation-bonuses')
@Public()
export class FetchFormationBonusesController {
  @Get()
  handle() {
    return { formationBonuses: FormationBonusesPresenter.toHTTP() }
  }
}
