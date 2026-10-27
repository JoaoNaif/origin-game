import { Either, left, right } from '@/core/either'
import { ResourceAlreadyExistsError } from '@/core/errors/err/resource-already-exists-error'
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

type CreateCatalogEntryUseCaseRequest = CatalogInput & { key: string }

type CreateCatalogEntryUseCaseResponse = Either<
  | ResourceAlreadyExistsError
  | ResourceNotFoundError
  | InvalidCatalogError
  | CatalogEntryError,
  { entry: CatalogEntry; catalog: GameCatalog }
>

/**
 * Admin cria um item do catálogo (variante, traço, modelo, skill, campo ou squad de NPC). A `key` é única por tipo e
 * não muda depois. Devolve o catálogo novo (o presenter liga as `keys`).
 */
export class CreateCatalogEntryUseCase {
  constructor(private catalogRepository: CatalogRepository) {}

  async execute({
    key,
    ...input
  }: CreateCatalogEntryUseCaseRequest): Promise<CreateCatalogEntryUseCaseResponse> {
    const catalog = await this.catalogRepository.load()

    if (findCatalogEntry(catalog, input.kind, key)) {
      return left(new ResourceAlreadyExistsError(key))
    }

    const built = buildCatalogEntry(catalog, key, input as CatalogInput)
    if (built.isLeft()) return left(built.value)

    const saved = await this.catalogRepository.save(built.value)
    if (saved.isLeft()) return left(saved.value)

    return right({
      entry: built.value,
      catalog: await this.catalogRepository.load(),
    })
  }
}
