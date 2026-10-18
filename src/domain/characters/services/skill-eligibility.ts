import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Skill } from '@/domain/skills/entities/skill'
import { CharacterTemplate } from '../entities/character-template'

export interface SkillOwner {
  template: CharacterTemplate
  level: number
  awakenedVariantId: UniqueEntityId | null
}

/**
 * Por que o personagem (do jogador ou NPC) não pode ter a skill, ou `null` se pode.
 * Só das próprias variantes (none só sem variante, D25), com o nível mínimo atingido; a despertada só na
 * variante despertada dele (D96).
 */
export function skillEligibilityError(
  skill: Skill,
  owner: SkillOwner
): string | null {
  if (skill.minLevel > owner.level) {
    return `skill ${skill.key} liberada no nível ${skill.minLevel} (personagem no ${owner.level})`
  }

  const skillVariantId = skill.variantId

  if (!skillVariantId) {
    return owner.template.variants.length === 0
      ? null
      : `skill none ${skill.key} só para quem não tem variante`
  }

  if (skill.isAwakened) {
    return owner.awakenedVariantId?.equals(skillVariantId)
      ? null
      : `skill despertada ${skill.key} só após despertar nessa variante`
  }

  const ownsVariant = owner.template.variants.some((v) =>
    v.variantId.equals(skillVariantId)
  )

  return ownsVariant ? null : `skill ${skill.key} de outra variante`
}
