import { CharacterTemplate } from '@/domain/characters/entities/character-template'
import { Variant } from '@/domain/characters/entities/variant'
import { Skill } from '@/domain/skills/entities/skill'
import { SkillKitSlot } from '@/domain/skills/enums/skill-kit-slot'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { makeSkill } from './make-skill'

const SLOTS = [
  SkillKitSlot.BASIC,
  SkillKitSlot.STANDARD,
  SkillKitSlot.ROLE,
  SkillKitSlot.SIGNATURE,
]

/**
 * Kit básico válido para o modelo (D92, D97). `variants` na ordem do modelo, principal primeiro:
 * 0 = 4 none; 1 = 4 da variante; 2 = 2 + 2; 3 = 2 da principal + 1 + 1.
 */
export function makeBasicKit(
  template: CharacterTemplate,
  variants: Variant[] = []
): Skill[] {
  const owners: (Variant | null)[] =
    variants.length === 0
      ? [null, null, null, null]
      : variants.length === 1
        ? [variants[0], variants[0], variants[0], variants[0]]
        : variants.length === 2
          ? [variants[0], variants[0], variants[1], variants[1]]
          : [variants[0], variants[0], variants[1], variants[2]]

  return SLOTS.map((slot, index) =>
    makeSkill({
      key: `${template.key}-kit-${slot.toLowerCase()}`,
      variant: owners[index],
      tier: slot === SkillKitSlot.BASIC ? SkillTier.BASIC : SkillTier.STANDARD,
      kitClass: template.characterClass,
      kitSlot: slot,
    })
  )
}
