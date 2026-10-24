import { Controller, Get } from '@nestjs/common'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Public } from '@/infra/auth/public'
import { TraitPresenter } from '../../presenters/trait-presenter'

/** GET /traits — catálogo público dos traços (nome, categoria e efeitos de cada `key`). */
@Controller('traits')
@Public()
export class FetchTraitsController {
  constructor(private catalogRepository: CatalogRepository) {}

  @Get()
  async handle() {
    const catalog = await this.catalogRepository.load()
    const traits = [...catalog.traits.values()].sort((a, b) =>
      a.name.localeCompare(b.name)
    )

    return { traits: traits.map((t) => TraitPresenter.toHTTP(t, catalog)) }
  }
}
