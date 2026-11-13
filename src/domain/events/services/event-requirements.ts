import { CharacterClass } from '@/domain/characters/enums/character-class'
import { DangerLevel } from '@/domain/characters/enums/danger-level'
import { Lineage } from '@/domain/characters/enums/lineage'
import { Rarity } from '@/domain/characters/enums/rarity'
import { RARITY_ORDER } from '@/domain/economy/economy-values'
import { EventRequirement } from '../value-objects/event-requirement'

/** O que os requisitos olham de cada personagem do squad. */
export interface EventSquadMember {
  name: string
  level: number
  characterClass: CharacterClass
  /** Linhagens das variantes do personagem. */
  lineages: readonly Lineage[]
  /** `key` dos traços (o de família entra aqui). */
  traitKeys: readonly string[]
  rarity: Rarity
  danger: DangerLevel
}

const DANGER_ORDER: readonly DangerLevel[] = Object.values(DangerLevel)

/**
 * O primeiro requisito que o squad não cumpre (D155, `events_brief.md` 2), já em texto para o jogador; nulo = entra.
 * "Todos" vale para cada personagem; "pelo menos N" conta no squad.
 */
export function eventRequirementError(
  requirements: readonly EventRequirement[],
  members: readonly EventSquadMember[]
): string | null {
  for (const requirement of requirements) {
    switch (requirement.type) {
      case 'MIN_LEVEL': {
        const low = members.find((m) => m.level < requirement.level)
        if (low) {
          return `todos no nível ${requirement.level} ou acima (${low.name} está no ${low.level})`
        }
        break
      }
      case 'CLASS_COUNT': {
        const count = members.filter(
          (m) => m.characterClass === requirement.characterClass
        ).length
        if (count < requirement.min) {
          return `pelo menos ${requirement.min} da classe ${requirement.characterClass} (o squad tem ${count})`
        }
        break
      }
      case 'LINEAGE': {
        const count = members.filter((m) =>
          m.lineages.includes(requirement.lineage)
        ).length
        if (count < requirement.min) {
          return `pelo menos ${requirement.min} da linhagem ${requirement.lineage} (o squad tem ${count})`
        }
        break
      }
      case 'FAMILY': {
        const count = members.filter((m) =>
          m.traitKeys.includes(requirement.traitKey)
        ).length
        if (count < requirement.min) {
          return `pelo menos ${requirement.min} da família ${requirement.traitKey} (o squad tem ${count})`
        }
        break
      }
      case 'MIN_DANGER': {
        const min = DANGER_ORDER.indexOf(requirement.level)
        const low = members.find((m) => DANGER_ORDER.indexOf(m.danger) < min)
        if (low) {
          return `todos com periculosidade ${requirement.level} ou acima (${low.name} é ${low.danger})`
        }
        break
      }
      case 'MAX_RARITY': {
        const max = RARITY_ORDER.indexOf(requirement.rarity)
        const high = members.find((m) => RARITY_ORDER.indexOf(m.rarity) > max)
        if (high) {
          return `todos com raridade ${requirement.rarity} ou abaixo (${high.name} é ${high.rarity})`
        }
        break
      }
    }
  }

  return null
}
