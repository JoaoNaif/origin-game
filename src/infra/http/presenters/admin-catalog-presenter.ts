import {
  CatalogEntry,
  GameCatalog,
} from '@/domain/catalog/applications/repositories/catalog-repository'
import { templateSkills } from '@/domain/catalog/services/template-skills'
import { CharacterTemplate } from '@/domain/characters/entities/character-template'
import { Trait } from '@/domain/characters/entities/trait'
import { Variant } from '@/domain/characters/entities/variant'
import { BattleField } from '@/domain/combat/entities/battle-field'
import { Skill } from '@/domain/skills/entities/skill'
import { skillReference } from '@/domain/skills/services/skill-reference'
import { NpcSquad } from '@/domain/squads/entities/npc-squad'

type Id = { toValue(): string } | null

const keyOf = (map: ReadonlyMap<string, { key: string }>, id: Id) =>
  id ? (map.get(id.toValue())?.key ?? null) : null

const byKey = <T extends { key: string }>(items: Iterable<T>) =>
  [...items].sort((a, b) => a.key.localeCompare(b.key))

/**
 * Catálogo como o admin vê: tudo, inclusive o que o jogador não vê (formação e skills dos NPCs). Cada item sai no
 * formato do corpo de `POST`/`PUT /admin/<tipo>` (ligações pela `key`) mais campos só de leitura, então a tela edita e
 * devolve o mesmo objeto.
 */
export class AdminCatalogPresenter {
  static toHTTP(catalog: GameCatalog) {
    return {
      version: catalog.version,
      variants: byKey(catalog.variants.values()).map((v) =>
        AdminCatalogPresenter.variant(v, catalog)
      ),
      traits: byKey(catalog.traits.values()).map((t) =>
        AdminCatalogPresenter.trait(t, catalog)
      ),
      templates: byKey(catalog.templates.values()).map((t) =>
        AdminCatalogPresenter.template(t, catalog)
      ),
      skills: byKey(catalog.skills.values()).map((s) =>
        AdminCatalogPresenter.skill(s, catalog)
      ),
      fields: byKey(catalog.fields).map((f) =>
        AdminCatalogPresenter.field(f, catalog)
      ),
      npcSquads: byKey(catalog.npcSquads).map((n) =>
        AdminCatalogPresenter.npcSquad(n, catalog)
      ),
    }
  }

  static entry({ kind, entity }: CatalogEntry, catalog: GameCatalog) {
    switch (kind) {
      case 'VARIANT':
        return AdminCatalogPresenter.variant(entity, catalog)
      case 'TRAIT':
        return AdminCatalogPresenter.trait(entity, catalog)
      case 'TEMPLATE':
        return AdminCatalogPresenter.template(entity, catalog)
      case 'SKILL':
        return AdminCatalogPresenter.skill(entity, catalog)
      case 'FIELD':
        return AdminCatalogPresenter.field(entity, catalog)
      case 'NPC_SQUAD':
        return AdminCatalogPresenter.npcSquad(entity, catalog)
    }
  }

  static variant(variant: Variant, catalog: GameCatalog) {
    return {
      key: variant.key,
      name: variant.name,
      lineage: variant.lineage,
      description: variant.description,
      awakensFromKey: keyOf(catalog.variants, variant.awakensFromId),
    }
  }

  static trait(trait: Trait, catalog: GameCatalog) {
    return {
      key: trait.key,
      name: trait.name,
      description: trait.description,
      category: trait.category,
      source: trait.source,
      variantKey: keyOf(catalog.variants, trait.variantId),
      effects: trait.effects,
    }
  }

  static template(template: CharacterTemplate, catalog: GameCatalog) {
    return {
      key: template.key,
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
      stats: template.stats,
      passive: template.passive,
      /** Só leitura: as skills de `key` com o prefixo do modelo (kit primeiro). */
      skillKeys: templateSkills(catalog, template).map((s) => s.key),
    }
  }

  static skill(skill: Skill, catalog: GameCatalog) {
    const prefix = skill.key.includes(':') ? skill.key.split(':')[0] : null
    const template = prefix
      ? [...catalog.templates.values()].find((t) => t.key === prefix)
      : undefined

    return {
      key: skill.key,
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
      effects: skill.effects,
      // só leitura
      lineage: skill.lineage,
      isAwakened: skill.isAwakened,
      templateKey: template?.key ?? null,
      /** Valores de referência do tipo + forma (D16), para comparar com os guardados. */
      reference: skillReference({
        tier: skill.tier,
        target: skill.target,
        range: skill.range,
        area: skill.area,
        isNone: skill.isNone,
      }),
    }
  }

  static field(field: BattleField, catalog: GameCatalog) {
    return {
      key: field.key,
      name: field.name,
      description: field.description,
      requiredTraitKeys: field.requiredTraitIds.map((id) =>
        keyOf(catalog.traits, id)!
      ),
      primaryStat: field.primaryStat,
      secondaryStat: field.secondaryStat,
      primaryPercent: field.primaryPercent,
      secondaryPercent: field.secondaryPercent,
    }
  }

  static npcSquad(squad: NpcSquad, catalog: GameCatalog) {
    return {
      key: squad.key,
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
      // só leitura: o nível que aparece na escolha do adversário
      level: Math.max(...squad.members.map((m) => m.level)),
    }
  }
}
