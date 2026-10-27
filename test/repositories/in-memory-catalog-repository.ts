import { Either, left, right } from '@/core/either'
import { ResourceInUseError } from '@/core/errors/err/resource-in-use-error'
import {
  CatalogEntry,
  CatalogKind,
  CatalogRepository,
  GameCatalog,
} from '@/domain/catalog/applications/repositories/catalog-repository'
import { InvalidCatalogError } from '@/domain/catalog/errors/invalid-catalog-error'
import { catalogIntegrityError } from '@/domain/catalog/services/catalog-integrity'
import { loadSeedContent } from '../../prisma/seed/content'

/** O conteúdo do seed, sem banco. */
export function seedCatalog(): GameCatalog {
  const content = loadSeedContent()

  return {
    ...content.catalog,
    fields: content.fields,
    npcSquads: content.npcSquads,
    version: 'seed-test',
  }
}

function withEntry(
  catalog: GameCatalog,
  entry: CatalogEntry | null,
  remove?: { kind: CatalogKind; id: string }
): GameCatalog {
  const kind = entry?.kind ?? remove!.kind
  const id = entry?.entity.id.toString() ?? remove!.id

  const map = <T>(items: ReadonlyMap<string, T>, own: boolean) => {
    if (!own) return items
    const copy = new Map(items)
    if (entry) copy.set(id, entry.entity as T)
    else copy.delete(id)
    return copy
  }
  const list = <T extends { id: { toString(): string } }>(
    items: readonly T[],
    own: boolean
  ) => {
    if (!own) return items
    const rest = items.filter((item) => item.id.toString() !== id)
    return entry ? [...rest, entry.entity as unknown as T] : rest
  }

  return {
    variants: map(catalog.variants, kind === 'VARIANT'),
    traits: map(catalog.traits, kind === 'TRAIT'),
    templates: map(catalog.templates, kind === 'TEMPLATE'),
    skills: map(catalog.skills, kind === 'SKILL'),
    fields: list(catalog.fields, kind === 'FIELD'),
    npcSquads: list(catalog.npcSquads, kind === 'NPC_SQUAD'),
    version: `${catalog.version}+`,
  }
}

export class InMemoryCatalogRepository implements CatalogRepository {
  /** Ids que um jogador usa (personagem, skill aprendida): no banco, a chave estrangeira impede apagar. */
  public playerUsedIds = new Set<string>()

  constructor(public catalog: GameCatalog = seedCatalog()) {}

  async load(): Promise<GameCatalog> {
    return this.catalog
  }

  async save(entry: CatalogEntry): Promise<Either<InvalidCatalogError, void>> {
    return this.replace(withEntry(this.catalog, entry))
  }

  async delete(
    kind: CatalogKind,
    id: string
  ): Promise<Either<InvalidCatalogError | ResourceInUseError, void>> {
    if (this.playerUsedIds.has(id)) return left(new ResourceInUseError(id))

    return this.replace(withEntry(this.catalog, null, { kind, id }))
  }

  private replace(next: GameCatalog): Either<InvalidCatalogError, void> {
    const error = catalogIntegrityError(next)
    if (error) return left(new InvalidCatalogError(error))

    this.catalog = next
    return right(undefined)
  }
}
