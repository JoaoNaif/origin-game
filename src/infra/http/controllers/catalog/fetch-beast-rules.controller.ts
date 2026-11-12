import { Controller, Get } from '@nestjs/common'
import {
  BEAST_DURATION,
  BEAST_FIELD_CAP,
  BEAST_GRADE_ORDER,
  BEAST_SPEED_SHARE,
  BEAST_WILL_SHARE,
  BEASTS_PER_CHARACTER,
  DOMINANCE_WILL_COST,
  EQUALITY_ABSORB_SHARE,
  EQUALITY_BREAK_PERCENT,
  EQUALITY_VALUES,
  MASTER_REQUIREMENT_COUNT,
  beastSaleValue,
  beastStatPercent,
} from '@/domain/beasts/beast-values'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Public } from '@/infra/auth/public'
import { BeastPresenter } from '../../presenters/beast-presenter'

/** GET /beast-rules — regras dos contratos com bestas (D95, D154), lidas das constantes, e o catálogo de bestas. */
@Controller('beast-rules')
@Public()
export class FetchBeastRulesController {
  constructor(private catalogRepository: CatalogRepository) {}

  @Get()
  async handle() {
    const catalog = await this.catalogRepository.load()

    return {
      beastRules: {
        grades: BEAST_GRADE_ORDER.map((grade) => ({
          grade,
          statPercent: {
            DOMINANCE: beastStatPercent('DOMINANCE', grade),
            MASTER: beastStatPercent('MASTER', grade),
          },
          dominanceWillCost: DOMINANCE_WILL_COST[grade],
          equality: EQUALITY_VALUES[grade],
          masterRequirements: MASTER_REQUIREMENT_COUNT[grade],
          saleValue: beastSaleValue(grade),
        })),
        speedShare: BEAST_SPEED_SHARE,
        willShare: BEAST_WILL_SHARE,
        duration: BEAST_DURATION,
        fieldCap: BEAST_FIELD_CAP,
        perCharacter: BEASTS_PER_CHARACTER,
        equalityAbsorbShare: EQUALITY_ABSORB_SHARE,
        equalityBreakPercent: EQUALITY_BREAK_PERCENT,
      },
      beasts: [...catalog.beastTemplates.values()]
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((b) => BeastPresenter.template(b)),
    }
  }
}
