import { Controller, Get } from '@nestjs/common'
import { Public } from '@/infra/auth/public'
import { DomRulesPresenter } from '../../presenters/dom-rules-presenter'

/** GET /dom-rules — regras do DOM (D93, D152): pilares, níveis, feitos e skills únicas, lidos das constantes. */
@Controller('dom-rules')
@Public()
export class FetchDomRulesController {
  @Get()
  handle() {
    return { domRules: DomRulesPresenter.toHTTP() }
  }
}
