import { Controller, Get } from '@nestjs/common'
import { Public } from '@/infra/auth/public'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { TemplatePresenter } from '../../presenters/template-presenter'

/** GET /templates — catálogo público: leitura direta do repositório, sem caso de uso. */
@Controller('templates')
@Public()
export class FetchTemplatesController {
  constructor(private catalogRepository: CatalogRepository) {}

  @Get()
  async handle() {
    const catalog = await this.catalogRepository.load()
    const templates = [...catalog.templates.values()].sort((a, b) =>
      a.name.localeCompare(b.name)
    )

    return {
      templates: templates.map((t) => TemplatePresenter.toHTTP(t, catalog)),
    }
  }
}
