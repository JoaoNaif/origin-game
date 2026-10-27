import { Either, left, right } from '@/core/either'
import { ResourceInUseError } from '@/core/errors/err/resource-in-use-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { InvalidCatalogError } from '../../errors/invalid-catalog-error'
import { catalogUsages, findCatalogEntry } from '../../services/catalog-entries'
import {
  CatalogKind,
  CatalogRepository,
} from '../repositories/catalog-repository'

interface DeleteCatalogEntryUseCaseRequest {
  kind: CatalogKind
  key: string
}

type DeleteCatalogEntryUseCaseResponse = Either<
  ResourceNotFoundError | ResourceInUseError | InvalidCatalogError,
  null
>

/**
 * Admin apaga um item do catálogo. Nada sai em cascata: item usado por outro (no catálogo ou por um jogador) dá
 * `ResourceInUseError`, dizendo quem usa.
 */
export class DeleteCatalogEntryUseCase {
  constructor(private catalogRepository: CatalogRepository) {}

  async execute({
    kind,
    key,
  }: DeleteCatalogEntryUseCaseRequest): Promise<DeleteCatalogEntryUseCaseResponse> {
    const catalog = await this.catalogRepository.load()

    const entry = findCatalogEntry(catalog, kind, key)
    if (!entry) return left(new ResourceNotFoundError(key))

    const usages = catalogUsages(catalog, entry)
    if (usages.length > 0) return left(new ResourceInUseError(key, usages))

    const deleted = await this.catalogRepository.delete(
      kind,
      entry.entity.id.toString()
    )
    if (deleted.isLeft()) {
      // o repositório só conhece o id: a mensagem diz a `key`
      return left(
        deleted.value instanceof ResourceInUseError
          ? new ResourceInUseError(key, ['jogadores'])
          : deleted.value
      )
    }

    return right(null)
  }
}
