import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Trait, TraitProps } from '@/domain/characters/entities/trait'
import { Stat } from '@/domain/characters/enums/stat'
import { TraitCategory } from '@/domain/characters/enums/trait-category'
import { TraitSource } from '@/domain/characters/enums/trait-source'

export function makeTrait(
  override: Partial<TraitProps> = {},
  id?: UniqueEntityId
): Trait {
  const result = Trait.create(
    {
      key: 'veteran',
      name: 'Veterano',
      category: TraitCategory.ORIGIN,
      source: TraitSource.CONQUERED,
      effects: [{ type: 'STAT_MODIFIER', stat: Stat.WILL, percent: 3 }],
      ...override,
    },
    id
  )

  if (result.isLeft()) throw result.value

  return result.value
}
