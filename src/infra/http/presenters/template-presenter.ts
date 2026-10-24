import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { templateSkills } from '@/domain/catalog/services/template-skills'
import { CharacterTemplate } from '@/domain/characters/entities/character-template'
import { Skill } from '@/domain/skills/entities/skill'

export class SkillPresenter {
  static toHTTP(skill: Skill) {
    return {
      key: skill.key,
      name: skill.name,
      description: skill.description,
      lineage: skill.lineage,
      isAwakened: skill.isAwakened,
      tier: skill.tier,
      target: skill.target,
      range: skill.range,
      area: skill.area,
      cooldown: skill.cooldown,
      desgastePercent: skill.desgastePercent,
      baseHitChance: skill.baseHitChance,
      minLevel: skill.minLevel,
      kitSlot: skill.kitSlot,
      effects: skill.effects,
    }
  }
}

/** Modelo do catálogo, com as variantes, o traço de família e as skills (kit primeiro). */
export class TemplatePresenter {
  static toHTTP(template: CharacterTemplate, catalog: GameCatalog) {
    const familyTrait = template.familyTraitId
      ? catalog.traits.get(template.familyTraitId.toValue())
      : null

    return {
      key: template.key,
      name: template.name,
      description: template.description,
      characterClass: template.characterClass,
      rarity: template.rarity,
      initialDanger: template.initialDanger,
      variants: template.variants.map(({ variantId, isPrimary }) => {
        const variant = catalog.variants.get(variantId.toValue())!

        return {
          key: variant.key,
          name: variant.name,
          lineage: variant.lineage,
          isPrimary,
        }
      }),
      familyTrait: familyTrait
        ? { key: familyTrait.key, name: familyTrait.name }
        : null,
      stats: template.stats,
      passive: template.passive,
      skills: templateSkills(catalog, template).map(SkillPresenter.toHTTP),
    }
  }
}
