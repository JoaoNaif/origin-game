import { Skill } from '@/domain/skills/entities/skill'
import { SkillKitSlot } from '@/domain/skills/enums/skill-kit-slot'
import { CharacterTemplate } from '../entities/character-template'

/** Tamanho da build de batalha e do kit básico (D43, D92). */
export const BUILD_SIZE = 4

const ALL_KIT_SLOTS = Object.values(SkillKitSlot)

/**
 * Quantas skills do kit vêm de cada variante (D97): 1 variante = 4; 2 = 2 e 2; 3 = 2 da principal e 1 de cada
 * outra. Sem variante = 4 skills none (chave `null`).
 */
function expectedKitCounts(
  template: CharacterTemplate
): Map<string | null, number> {
  const variants = template.variants

  if (variants.length === 0) return new Map([[null, BUILD_SIZE]])

  if (variants.length === 1) {
    return new Map([[variants[0].variantId.toValue(), BUILD_SIZE]])
  }

  if (variants.length === 2) {
    return new Map(variants.map((v) => [v.variantId.toValue(), 2]))
  }

  return new Map(
    variants.map((v) => [v.variantId.toValue(), v.isPrimary ? 2 : 1])
  )
}

/** Valida o kit básico: 4 skills de kit da classe, um de cada papel, divididas pelas variantes (D92, D97). */
export function validateBasicKit(
  template: CharacterTemplate,
  kitSkills: Skill[]
): string | null {
  if (kitSkills.length !== BUILD_SIZE) {
    return `o kit básico tem ${BUILD_SIZE} skills`
  }

  if (kitSkills.some((s) => s.kitClass !== template.characterClass)) {
    return 'skill de kit de outra classe'
  }

  const slots = new Set(kitSkills.map((s) => s.kitSlot))
  if (ALL_KIT_SLOTS.some((slot) => !slots.has(slot))) {
    return 'o kit tem um de cada papel (BASIC, STANDARD, ROLE, SIGNATURE)'
  }

  const counts = new Map<string | null, number>()
  for (const skill of kitSkills) {
    const key = skill.variantId?.toValue() ?? null
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const expected = expectedKitCounts(template)
  const matches =
    counts.size === expected.size &&
    [...expected].every(([key, count]) => counts.get(key) === count)

  if (!matches) {
    return 'divisão do kit entre as variantes não confere (D97)'
  }

  return null
}
