import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import {
  CharacterTemplate,
  CreateCharacterTemplateInput,
} from '@/domain/characters/entities/character-template'
import { CharacterClass } from '@/domain/characters/enums/character-class'
import { DangerLevel } from '@/domain/characters/enums/danger-level'
import { Exclusivity } from '@/domain/characters/enums/exclusivity'
import { Rarity } from '@/domain/characters/enums/rarity'
import { StatBlock } from '@/domain/characters/value-objects/stat-block'

/** Perfil padrão da Vanguarda no nível 100 (`classes_brief.md` 2, D91): orçamento 670. */
export const VANGUARD_STATS: StatBlock = {
  HP: 700,
  ATTACK: 100,
  DEFENSE: 120,
  SPEED: 75,
  PRECISION: 85,
  EVASION: 55,
  WILL: 95,
}

export function makeCharacterTemplateInput(
  override: Partial<CreateCharacterTemplateInput> = {}
): CreateCharacterTemplateInput {
  return {
    key: 'recruit-vanguard',
    name: 'Recruta',
    characterClass: CharacterClass.VANGUARD,
    rarity: Rarity.E,
    initialDanger: DangerLevel.DISCRETE,
    exclusivity: Exclusivity.NONE,
    variants: [],
    stats: VANGUARD_STATS,
    passive: {
      name: 'Firmeza',
      description: 'Com HP abaixo de 30%, recebe 10% menos dano.',
      trigger: { type: 'HP_BELOW', percent: 30 },
      effects: [{ type: 'REDUCE_DAMAGE', percent: 10 }],
    },
    ...override,
  }
}

export function makeCharacterTemplate(
  override: Partial<CreateCharacterTemplateInput> = {},
  id?: UniqueEntityId
): CharacterTemplate {
  const result = CharacterTemplate.create(
    makeCharacterTemplateInput(override),
    id
  )

  if (result.isLeft()) throw result.value

  return result.value
}
