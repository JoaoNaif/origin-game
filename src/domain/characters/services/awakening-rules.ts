import { AWAKENED_MIN_LEVEL } from '@/domain/skills/enums/skill-tier'
import { CharacterTemplate } from '../entities/character-template'
import { Variant } from '../entities/variant'

/**
 * Por que o personagem (do jogador ou NPC) não pode despertar nesta variante, ou `null` se pode (D67, D96):
 * exatamente 1 variante, nível ≥ 80, e a variante é uma despertada da variante dele.
 */
export function awakeningError(
  variant: Variant,
  template: CharacterTemplate,
  level: number
): string | null {
  if (template.variants.length !== 1) {
    return 'só desperta quem tem exatamente 1 variante'
  }

  if (level < AWAKENED_MIN_LEVEL) {
    return `desperta a partir do nível ${AWAKENED_MIN_LEVEL}`
  }

  const baseId = template.variants[0].variantId
  if (!variant.isAwakened || !variant.awakensFromId?.equals(baseId)) {
    return 'a variante precisa ser uma despertada da variante do personagem'
  }

  return null
}
