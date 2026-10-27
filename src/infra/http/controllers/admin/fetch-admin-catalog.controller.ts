import { Controller, Get } from '@nestjs/common'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Admin } from '@/infra/auth/admin'
import { AdminCatalogPresenter } from '../../presenters/admin-catalog-presenter'

/**
 * GET /admin/catalog — o catálogo inteiro como o admin edita (com a formação e as skills dos NPCs, que o jogador não
 * vê). Lido direto do repositório, como o catálogo público.
 */
@Controller('admin/catalog')
@Admin()
export class FetchAdminCatalogController {
  constructor(private catalogRepository: CatalogRepository) {}

  @Get()
  async handle() {
    const catalog = await this.catalogRepository.load()

    return { catalog: AdminCatalogPresenter.toHTTP(catalog) }
  }
}
