import { Body, Controller, Param, Put } from '@nestjs/common'
import { CatalogKind } from '@/domain/catalog/applications/repositories/catalog-repository'
import { UpdateCatalogEntryUseCase } from '@/domain/catalog/applications/use-cases/update-catalog-entry'
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
 * PUT /admin/:collection/:key — troca o item inteiro (a `key` não muda). Vale na hora para as contas; batalhas em
 * andamento seguem com a foto do início.
 */
@Controller('admin')
@Admin()
export class UpdateCatalogEntryController {
  constructor(private updateCatalogEntry: UpdateCatalogEntryUseCase) {}

  @Put(':collection/:key')
  async handle(
    @Param('collection', new ZodValidationPipe(catalogCollectionSchema))
    kind: CatalogKind,
    @Param('key', new ZodValidationPipe(catalogKeySchema)) key: string,
    @Body() body: unknown
  ) {
    const data = new ZodValidationPipe(catalogBodySchemas[kind]).transform(body)

    const result = await this.updateCatalogEntry.execute({
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
