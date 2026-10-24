import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Trait } from '@/domain/characters/entities/trait'

/** Traço do catálogo: o que a tela mostra no lugar da `key` (personagens, unidades e campos de batalha). */
export class TraitPresenter {
  static toHTTP(trait: Trait, catalog: GameCatalog) {
    return {
      key: trait.key,
      name: trait.name,
      description: trait.description,
      category: trait.category,
      source: trait.source,
      variantKey: trait.variantId
        ? (catalog.variants.get(trait.variantId.toValue())?.key ?? null)
        : null,
      effects: trait.effects,
    }
  }
}
