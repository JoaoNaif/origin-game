import { Awakening } from '@/domain/characters/entities/awakening'
import { CharacterTemplate } from '@/domain/characters/entities/character-template'
import { Trait } from '@/domain/characters/entities/trait'
import { Variant } from '@/domain/characters/entities/variant'
import { validateBasicKit } from '@/domain/characters/services/basic-kit'
import { BattleField } from '@/domain/combat/entities/battle-field'
import { SnapshotCatalog } from '@/domain/combat/services/build-snapshot'
import { Skill } from '@/domain/skills/entities/skill'
import { NpcSquad } from '@/domain/squads/entities/npc-squad'
import { buildAwakenings } from './awakenings'
import { buildFields, buildTraits, buildVariants } from './catalog'
import { BuiltCharacter, buildCharacters, ContentOverrides } from './characters'
import { buildNpcSquads } from './npc-squads'

/** Todo o conteúdo do MVP (`CLAUDE.md`: no MVP o conteúdo vem do `seed.ts`), já validado pelo domínio. */
export interface SeedContent {
  variants: Map<string, Variant>
  traits: Map<string, Trait>
  characters: BuiltCharacter[]
  fields: BattleField[]
  npcSquads: NpcSquad[]
  /** Despertares pela `key` (D151). */
  awakenings: Map<string, Awakening>
  /** Catálogo indexado pelo id, no formato de `buildNpcSide`/`buildPveSnapshot`. */
  catalog: SnapshotCatalog
}

export function loadSeedContent(overrides: ContentOverrides = {}): SeedContent {
  const variants = buildVariants()
  const traits = buildTraits(variants)
  const characters = buildCharacters(variants, traits, overrides)
  const fields = buildFields(traits)
  const npcSquads = buildNpcSquads(characters, traits)
  const awakenings = buildAwakenings(variants)

  for (const { template, skills } of characters) {
    const error = validateBasicKit(
      template,
      skills.filter((s) => s.isKit)
    )
    if (error) throw new Error(`seed: kit de ${template.key}: ${error}`)
  }

  const byId = <T extends { id: { toValue(): string } }>(items: Iterable<T>) =>
    new Map([...items].map((item) => [item.id.toValue(), item]))

  return {
    variants,
    traits,
    characters,
    fields,
    npcSquads,
    awakenings,
    catalog: {
      templates: byId<CharacterTemplate>(characters.map((c) => c.template)),
      variants: byId(variants.values()),
      skills: byId<Skill>(characters.flatMap((c) => c.skills)),
      traits: byId(traits.values()),
    },
  }
}
