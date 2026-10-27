import { Either, left, right } from '@/core/either'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { InvalidAwakenedVariantError } from '@/domain/characters/errors/invalid-awakened-variant-error'
import { InvalidCharacterTemplateError } from '@/domain/characters/errors/invalid-character-template-error'
import { InvalidTraitError } from '@/domain/characters/errors/invalid-trait-error'
import { InvalidVariantLineageError } from '@/domain/characters/errors/invalid-variant-lineage-error'
import { InvalidBattleFieldError } from '@/domain/combat/errors/invalid-battle-field-error'
import { InvalidSkillError } from '@/domain/skills/errors/invalid-skill-error'
import { InvalidNpcSquadError } from '@/domain/squads/errors/invalid-npc-squad-error'
import { AiDifficulty } from '@/domain/ai/enums/ai-difficulty'
import { AiProfile } from '@/domain/ai/enums/ai-profile'
import { CharacterTemplate } from '@/domain/characters/entities/character-template'
import { Trait } from '@/domain/characters/entities/trait'
import { Variant } from '@/domain/characters/entities/variant'
import { CharacterClass } from '@/domain/characters/enums/character-class'
import { DangerLevel } from '@/domain/characters/enums/danger-level'
import { Exclusivity } from '@/domain/characters/enums/exclusivity'
import { Lineage } from '@/domain/characters/enums/lineage'
import { Rarity } from '@/domain/characters/enums/rarity'
import { Stat } from '@/domain/characters/enums/stat'
import { TraitCategory } from '@/domain/characters/enums/trait-category'
import { TraitSource } from '@/domain/characters/enums/trait-source'
import { Passive } from '@/domain/characters/value-objects/passive'
import { StatBlock } from '@/domain/characters/value-objects/stat-block'
import { TraitEffect } from '@/domain/characters/value-objects/trait-effect'
import { BattleField } from '@/domain/combat/entities/battle-field'
import { Skill } from '@/domain/skills/entities/skill'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillKitSlot } from '@/domain/skills/enums/skill-kit-slot'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { SkillEffect } from '@/domain/skills/value-objects/skill-effect'
import { NpcSquad } from '@/domain/squads/entities/npc-squad'
import {
  CatalogEntry,
  GameCatalog,
} from '../applications/repositories/catalog-repository'

// O que o admin manda para criar ou editar cada item. As ligações vêm pela `key` (como no resto da API); a `key` do
// próprio item fica fora (na criação vem junto, na edição vem da URL e não muda).

export interface VariantInput {
  name: string
  lineage: Lineage
  description?: string | null
  /** Variante base, quando esta é despertada (D67). */
  awakensFromKey?: string | null
}

export interface TraitInput {
  name: string
  description?: string | null
  category: TraitCategory
  source: TraitSource
  /** Só vale para esta variante (traço de família). */
  variantKey?: string | null
  effects: TraitEffect[]
}

export interface TemplateInput {
  name: string
  description?: string | null
  characterClass: CharacterClass
  rarity: Rarity
  initialDanger: DangerLevel
  exclusivity: Exclusivity
  variants: { variantKey: string; isPrimary: boolean }[]
  familyTraitKey?: string | null
  stats: StatBlock
  passive: Passive
}

export interface SkillInput {
  name: string
  description?: string | null
  /** Nulo = skill none. */
  variantKey?: string | null
  tier: SkillTier
  target: SkillTarget
  range?: SkillRange | null
  area: SkillArea
  cooldown: number
  desgastePercent: number
  baseHitChance?: number | null
  minLevel: number
  kitClass?: CharacterClass | null
  kitSlot?: SkillKitSlot | null
  effects: SkillEffect[]
}

export interface FieldInput {
  name: string
  description?: string | null
  requiredTraitKeys: string[]
  primaryStat: Stat
  secondaryStat: Stat
  primaryPercent?: number
  secondaryPercent?: number
}

export interface NpcSquadMemberInput {
  templateKey: string
  level: number
  row: number
  column: number
  awakenedVariantKey?: string | null
  /** As 4 skills da build, na ordem dos slots. */
  skillKeys: string[]
  /** O traço de família do modelo entra sozinho, se faltar. */
  traitKeys?: string[]
}

export interface NpcSquadInput {
  name: string
  description?: string | null
  profile: AiProfile
  difficulty: AiDifficulty
  members: NpcSquadMemberInput[]
}

/** O pedido do admin, pelo tipo do item. */
export type CatalogInput =
  | { kind: 'VARIANT'; data: VariantInput }
  | { kind: 'TRAIT'; data: TraitInput }
  | { kind: 'TEMPLATE'; data: TemplateInput }
  | { kind: 'SKILL'; data: SkillInput }
  | { kind: 'FIELD'; data: FieldInput }
  | { kind: 'NPC_SQUAD'; data: NpcSquadInput }

/** Ligação (`key`) que não existe, ou regra do `create` do item. */
export type CatalogEntryError =
  | ResourceNotFoundError
  | InvalidVariantLineageError
  | InvalidAwakenedVariantError
  | InvalidTraitError
  | InvalidCharacterTemplateError
  | InvalidSkillError
  | InvalidBattleFieldError
  | InvalidNpcSquadError

type Built = Either<CatalogEntryError, CatalogEntry>

/** Uma `key` de ligação que não existe; vira `ResourceNotFoundError` em `buildCatalogEntry`. */
class MissingKey {
  constructor(public what: string) {}
}

function lookup<T extends { key: string }>(
  items: Iterable<T>,
  key: string,
  what: string
): T {
  for (const item of items) if (item.key === key) return item
  throw new MissingKey(`${what} ${key}`)
}

function optional<T extends { key: string }>(
  items: Iterable<T>,
  key: string | null | undefined,
  what: string
): T | null {
  return key ? lookup(items, key, what) : null
}

/**
 * Monta o item pelo `create` do domínio (as regras dele valem aqui), ligando as `keys` às entidades do catálogo.
 * `id` = o do item que está sendo editado (sem id, um novo).
 */
export function buildCatalogEntry(
  catalog: GameCatalog,
  key: string,
  input: CatalogInput,
  id?: UniqueEntityId
): Built {
  try {
    return build(catalog, key, input, id)
  } catch (error) {
    if (error instanceof MissingKey) {
      return left(new ResourceNotFoundError(error.what))
    }
    throw error
  }
}

function build(
  catalog: GameCatalog,
  key: string,
  input: CatalogInput,
  id?: UniqueEntityId
): Built {
  const variants = () => catalog.variants.values()
  const traits = () => catalog.traits.values()

  switch (input.kind) {
    case 'VARIANT': {
      const { awakensFromKey, ...data } = input.data
      const result = Variant.create(
        {
          key,
          ...data,
          awakensFrom: optional(variants(), awakensFromKey, 'variante'),
        },
        id
      )
      return result.isLeft()
        ? left(result.value)
        : right({ kind: input.kind, entity: result.value })
    }

    case 'TRAIT': {
      const { variantKey, ...data } = input.data
      const result = Trait.create(
        {
          key,
          ...data,
          variantId: optional(variants(), variantKey, 'variante')?.id ?? null,
        },
        id
      )
      return result.isLeft()
        ? left(result.value)
        : right({ kind: input.kind, entity: result.value })
    }

    case 'TEMPLATE': {
      const { variants: links, familyTraitKey, ...data } = input.data
      const result = CharacterTemplate.create(
        {
          key,
          ...data,
          variants: links.map((link) => ({
            variant: lookup(variants(), link.variantKey, 'variante'),
            isPrimary: link.isPrimary,
          })),
          familyTrait: optional(traits(), familyTraitKey, 'traço'),
        },
        id
      )
      return result.isLeft()
        ? left(result.value)
        : right({ kind: input.kind, entity: result.value })
    }

    case 'SKILL': {
      const { variantKey, ...data } = input.data
      const result = Skill.create(
        { key, ...data, variant: optional(variants(), variantKey, 'variante') },
        id
      )
      return result.isLeft()
        ? left(result.value)
        : right({ kind: input.kind, entity: result.value })
    }

    case 'FIELD': {
      const { requiredTraitKeys, ...data } = input.data
      const result = BattleField.create(
        {
          key,
          ...data,
          requiredTraits: requiredTraitKeys.map((k) =>
            lookup(traits(), k, 'traço')
          ),
        },
        id
      )
      return result.isLeft()
        ? left(result.value)
        : right({ kind: input.kind, entity: result.value })
    }

    case 'NPC_SQUAD': {
      const { members, ...data } = input.data
      const result = NpcSquad.create(
        {
          key,
          ...data,
          members: members.map((m) => {
            const template = lookup(
              catalog.templates.values(),
              m.templateKey,
              'modelo'
            )
            const memberTraits = (m.traitKeys ?? []).map((k) =>
              lookup(traits(), k, 'traço')
            )
            const family = template.familyTraitId
              ? catalog.traits.get(template.familyTraitId.toValue())
              : null
            if (family && !memberTraits.some((t) => t.id.equals(family.id))) {
              memberTraits.unshift(family)
            }

            return {
              template,
              level: m.level,
              row: m.row,
              column: m.column,
              awakenedVariant: optional(
                variants(),
                m.awakenedVariantKey,
                'variante'
              ),
              skills: m.skillKeys.map((k) =>
                lookup(catalog.skills.values(), k, 'skill')
              ),
              traits: memberTraits,
            }
          }),
        },
        id
      )
      return result.isLeft()
        ? left(result.value)
        : right({ kind: input.kind, entity: result.value })
    }
  }
}
