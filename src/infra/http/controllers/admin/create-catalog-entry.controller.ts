import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common'
import { CatalogKind } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CreateCatalogEntryUseCase } from '@/domain/catalog/applications/use-cases/create-catalog-entry'
import { CatalogInput } from '@/domain/catalog/services/catalog-builders'
import { Admin } from '@/infra/auth/admin'
import { catalogHttpError } from '../../catalog-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { AdminCatalogPresenter } from '../../presenters/admin-catalog-presenter'
import {
  catalogBodySchemas,
  catalogCollectionSchema,
  catalogKeySchema,
} from '../../schemas/catalog'

/**
 * POST /admin/:collection — cria um item do catálogo (`variants`, `traits`, `templates`, `skills`, `fields`,
 * `npc-squads`). O corpo é o da edição mais a `key`.
 */
@Controller('admin')
@Admin()
export class CreateCatalogEntryController {
  constructor(private createCatalogEntry: CreateCatalogEntryUseCase) {}

  @Post(':collection')
  @HttpCode(201)
  async handle(
    @Param('collection', new ZodValidationPipe(catalogCollectionSchema))
    kind: CatalogKind,
    @Body() body: unknown
  ) {
    const { key, ...data } = new ZodValidationPipe(
      catalogBodySchemas[kind].extend({ key: catalogKeySchema })
    ).transform(body) as { key: string }

    const result = await this.createCatalogEntry.execute({
      kind,
      key,
      data,
    } as CatalogInput & { key: string })

    if (result.isLeft()) throw catalogHttpError(result.value)

    const { entry, catalog } = result.value
    return {
      entry: AdminCatalogPresenter.entry(entry, catalog),
      version: catalog.version,
    }
  }
}
