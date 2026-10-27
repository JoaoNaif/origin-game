import { Controller, Delete, HttpCode, Param } from '@nestjs/common'
import { CatalogKind } from '@/domain/catalog/applications/repositories/catalog-repository'
import { DeleteCatalogEntryUseCase } from '@/domain/catalog/applications/use-cases/delete-catalog-entry'
import { Admin } from '@/infra/auth/admin'
import { catalogHttpError } from '../../catalog-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import {
  catalogCollectionSchema,
  catalogKeySchema,
} from '../../schemas/catalog'

/** DELETE /admin/:collection/:key — apaga o item; em uso (catálogo ou jogador) dá 409 dizendo quem usa. */
@Controller('admin')
@Admin()
export class DeleteCatalogEntryController {
  constructor(private deleteCatalogEntry: DeleteCatalogEntryUseCase) {}

  @Delete(':collection/:key')
  @HttpCode(204)
  async handle(
    @Param('collection', new ZodValidationPipe(catalogCollectionSchema))
    kind: CatalogKind,
    @Param('key', new ZodValidationPipe(catalogKeySchema)) key: string
  ) {
    const result = await this.deleteCatalogEntry.execute({ kind, key })

    if (result.isLeft()) throw catalogHttpError(result.value)
  }
}
