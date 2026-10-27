import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import {
  NpcSquadInput,
  SkillInput,
  TemplateInput,
} from '@/domain/catalog/services/catalog-builders'
import { CharacterTemplate } from '@/domain/characters/entities/character-template'
import { Skill } from '@/domain/skills/entities/skill'
import { NpcSquad } from '@/domain/squads/entities/npc-squad'

// Itens do seed no formato do pedido do admin (as ligações pela `key`), para criar cópias ou editar.

const keyOf = (
  map: ReadonlyMap<string, { key: string }>,
  id: { toValue(): string } | null
) => (id ? map.get(id.toValue())!.key : null)

export function templateInput(
  template: CharacterTemplate,
  catalog: GameCatalog
): TemplateInput {
  return {
    name: template.name,
    description: template.description,
    characterClass: template.characterClass,
    rarity: template.rarity,
    initialDanger: template.initialDanger,
    exclusivity: template.exclusivity,
    variants: template.variants.map((v) => ({
      variantKey: keyOf(catalog.variants, v.variantId)!,
      isPrimary: v.isPrimary,
    })),
    familyTraitKey: keyOf(catalog.traits, template.familyTraitId),
    stats: { ...template.stats },
    passive: template.passive,
  }
}

export function skillInput(skill: Skill, catalog: GameCatalog): SkillInput {
  return {
    name: skill.name,
    description: skill.description,
    variantKey: keyOf(catalog.variants, skill.variantId),
    tier: skill.tier,
    target: skill.target,
    range: skill.range,
    area: skill.area,
    cooldown: skill.cooldown,
    desgastePercent: skill.desgastePercent,
    baseHitChance: skill.baseHitChance,
    minLevel: skill.minLevel,
    kitClass: skill.kitClass,
    kitSlot: skill.kitSlot,
    effects: [...skill.effects],
  }
}

export function npcSquadInput(
  squad: NpcSquad,
  catalog: GameCatalog
): NpcSquadInput {
  return {
    name: squad.name,
    description: squad.description,
    profile: squad.profile,
    difficulty: squad.difficulty,
    members: squad.members.map((m) => ({
      templateKey: keyOf(catalog.templates, m.templateId)!,
      level: m.level,
      row: m.row,
      column: m.column,
      awakenedVariantKey: keyOf(catalog.variants, m.awakenedVariantId),
      skillKeys: m.skillIds.map((id) => keyOf(catalog.skills, id)!),
      traitKeys: m.traitIds.map((id) => keyOf(catalog.traits, id)!),
    })),
  }
}

export const byKey = <T extends { key: string }>(
  items: Iterable<T>,
  key: string
): T => [...items].find((item) => item.key === key)!
