import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { InvalidCatalogError } from '../../errors/invalid-catalog-error'
import {
  buildCatalogEntry,
  CatalogEntryError,
  CatalogInput,
} from '../../services/catalog-builders'
import { findCatalogEntry } from '../../services/catalog-entries'
import {
  CatalogEntry,
  CatalogRepository,
  GameCatalog,
} from '../repositories/catalog-repository'

type UpdateCatalogEntryUseCaseRequest = CatalogInput & { key: string }

type UpdateCatalogEntryUseCaseResponse = Either<
  CatalogEntryError | InvalidCatalogError,
  { entry: CatalogEntry; catalog: GameCatalog }
>

/**
 * Admin troca um item do catálogo inteiro (mesmo id e mesma `key`). Vale na hora para os personagens das contas (os
 * stats são calculados do modelo); as batalhas em andamento seguem com a foto do início.
 */
export class UpdateCatalogEntryUseCase {
  constructor(private catalogRepository: CatalogRepository) {}

  async execute({
    key,
    ...input
  }: UpdateCatalogEntryUseCaseRequest): Promise<UpdateCatalogEntryUseCaseResponse> {
    const catalog = await this.catalogRepository.load()

    const current = findCatalogEntry(catalog, input.kind, key)
    if (!current) return left(new ResourceNotFoundError(key))

    const built = buildCatalogEntry(
      catalog,
      key,
      input as CatalogInput,
      current.entity.id
    )
    if (built.isLeft()) return left(built.value)

    const saved = await this.catalogRepository.save(built.value)
    if (saved.isLeft()) return left(saved.value)

    return right({
      entry: built.value,
      catalog: await this.catalogRepository.load(),
    })
  }
}
