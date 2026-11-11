import { Controller, Get } from '@nestjs/common'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { INVENTORY_SLOTS } from '@/domain/economy/economy-values'
import {
  GEAR_ADMIN_TUNING,
  GEAR_BOND_FACTOR,
  GEAR_FULL_BOND_COST,
  GEAR_GRADE_ORDER,
  GEAR_GRADE_RARITY,
  GEAR_LINEAGE_PASSIVE,
  GEAR_MAX_WAIVERS,
  GEAR_NO_VARIANT_BONUS,
  GEAR_PASSIVE_GRADE_FACTOR,
  GEAR_PENALTIES,
  GEAR_REQUIREMENT_COUNT,
  GEAR_STAT_PERCENTS,
  gearSaleValue,
} from '@/domain/gear/gear-values'
import { Public } from '@/infra/auth/public'
import { GearPresenter } from '../../presenters/gear-presenter'

/**
 * GET /gear-rules — regras do equipamento vivo (D94, D153), lidas das constantes, e o catálogo de equipamentos (o
 * jogador vê o que existe, como em `/templates`).
 */
@Controller('gear-rules')
@Public()
export class FetchGearRulesController {
  constructor(private catalogRepository: CatalogRepository) {}

  @Get()
  async handle() {
    const catalog = await this.catalogRepository.load()

    return {
      gearRules: {
        grades: GEAR_GRADE_ORDER.map((grade) => ({
          grade,
          statPercents: GEAR_STAT_PERCENTS[grade],
          requirements: GEAR_REQUIREMENT_COUNT[grade],
          fullBondCostPercent: GEAR_FULL_BOND_COST[grade],
          passiveFactor: GEAR_PASSIVE_GRADE_FACTOR[grade],
          rarity: GEAR_GRADE_RARITY[grade],
          saleValue: gearSaleValue(grade),
          partial: GEAR_PENALTIES.PARTIAL[grade],
          none: GEAR_PENALTIES.NONE[grade],
        })),
        bondFactor: GEAR_BOND_FACTOR,
        adminTuning: GEAR_ADMIN_TUNING,
        maxWaivers: GEAR_MAX_WAIVERS,
        noVariantBonus: GEAR_NO_VARIANT_BONUS,
        /** Efeito de cada linhagem no grau Rei com elo pleno. */
        lineagePassives: GEAR_LINEAGE_PASSIVE,
        inventory: INVENTORY_SLOTS,
      },
      gear: [...catalog.gearTemplates.values()]
        .sort((a, b) => a.key.localeCompare(b.key))
        .map((g) => GearPresenter.template(g)),
    }
  }
}
