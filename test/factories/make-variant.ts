import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import {
  CreateVariantInput,
  Variant,
} from '@/domain/characters/entities/variant'
import { Lineage } from '@/domain/characters/enums/lineage'

export function makeVariant(
  override: Partial<CreateVariantInput> = {},
  id?: UniqueEntityId
): Variant {
  const result = Variant.create(
    {
      key: 'fire',
      name: 'Fogo',
      lineage: Lineage.ELEMENTAL,
      ...override,
    },
    id
  )

  if (result.isLeft()) throw result.value

  return result.value
}
