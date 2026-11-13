import { CharacterClass } from '@/domain/characters/enums/character-class'
import { DangerLevel } from '@/domain/characters/enums/danger-level'
import { Lineage } from '@/domain/characters/enums/lineage'
import { Rarity } from '@/domain/characters/enums/rarity'

/**
 * Requisito de entrada (D155, `events_brief.md` 2), conferido no squad a cada batalha do evento. "Uma linhagem só" da
 * pesquisa é `LINEAGE` com `min` 4. O de organização entra com as organizações.
 */
export type EventRequirement =
  /** Todos os personagens do squad com pelo menos este nível. */
  | { type: 'MIN_LEVEL'; level: number }
  /** Pelo menos `min` personagens desta classe (ex.: 4 suportes). */
  | { type: 'CLASS_COUNT'; characterClass: CharacterClass; min: number }
  /** Pelo menos `min` personagens com esta linhagem. */
  | { type: 'LINEAGE'; lineage: Lineage; min: number }
  /** Pelo menos `min` personagens com o traço de família (a `key` do traço). */
  | { type: 'FAMILY'; traitKey: string; min: number }
  /** Todos com periculosidade igual ou acima (D86). */
  | { type: 'MIN_DANGER'; level: DangerLevel }
  /** Todos com raridade igual ou abaixo (ex.: só E e D). */
  | { type: 'MAX_RARITY'; rarity: Rarity }

export type EventRequirementType = EventRequirement['type']
