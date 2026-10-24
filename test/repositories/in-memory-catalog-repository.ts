import {
  CatalogRepository,
  GameCatalog,
} from '@/domain/catalog/applications/repositories/catalog-repository'
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

export class InMemoryCatalogRepository implements CatalogRepository {
  constructor(public catalog: GameCatalog = seedCatalog()) {}

  async load(): Promise<GameCatalog> {
    return this.catalog
  }
}
