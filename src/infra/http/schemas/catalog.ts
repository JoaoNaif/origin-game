import { z } from 'zod'
import { AiDifficulty } from '@/domain/ai/enums/ai-difficulty'
import { AiProfile } from '@/domain/ai/enums/ai-profile'
import { CatalogKind } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharacterClass } from '@/domain/characters/enums/character-class'
import { DangerLevel } from '@/domain/characters/enums/danger-level'
import { Exclusivity } from '@/domain/characters/enums/exclusivity'
import { Lineage } from '@/domain/characters/enums/lineage'
import { Rarity } from '@/domain/characters/enums/rarity'
import { Stat } from '@/domain/characters/enums/stat'
import { TraitCategory } from '@/domain/characters/enums/trait-category'
import { TraitSource } from '@/domain/characters/enums/trait-source'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillKitSlot } from '@/domain/skills/enums/skill-kit-slot'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { StatusType } from '@/domain/skills/enums/status-type'
import { gridPositionSchema, statBlockSchema } from './common'

// Corpo das rotas de admin do catálogo. Aqui só o formato (tipos, campos de cada efeito); as regras (limites, Poder,
// orçamento da classe, kit) são do domínio. Os efeitos espelham `TraitEffect`, `Passive` e `SkillEffect`.

/** `key` do catálogo: minúsculas, números e hífen; `:` separa o modelo nas skills (`kael-vaz:detonacao`). */
export const catalogKeySchema = z
  .string()
  .max(80)
  .regex(/^[a-z0-9]+(?:[-:][a-z0-9]+)*$/, 'minúsculas, números, - e :')

const name = z.string().trim().min(1).max(60)
const description = z.string().max(1000).nullish()
const optionalKey = catalogKeySchema.nullish()
const stat = z.nativeEnum(Stat)
const status = z.nativeEnum(StatusType)

export const traitEffectSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('STAT_MODIFIER'), stat, percent: z.number() }),
  z.object({
    type: z.literal('SKILL_DAMAGE_MODIFIER'),
    range: z.nativeEnum(SkillRange),
    percent: z.number(),
  }),
  z.object({ type: z.literal('LINEAGE_COST_MODIFIER'), percent: z.number() }),
  z.object({
    type: z.literal('GEAR_REQUIREMENT_WAIVER'),
    count: z.number().int(),
  }),
  z.object({ type: z.literal('EXTRA_BEAST_SLOT'), count: z.number().int() }),
])

export const passiveTriggerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ALWAYS') }),
  z.object({
    type: z.literal('PERIODIC'),
    everyTurns: z.number().int().positive(),
  }),
  z.object({ type: z.literal('TURN_START') }),
  z.object({ type: z.literal('ON_ATTACK') }),
  z.object({ type: z.literal('ON_HIT') }),
  z.object({ type: z.literal('ON_KILL') }),
  z.object({ type: z.literal('ON_HEAL') }),
  z.object({ type: z.literal('HP_BELOW'), percent: z.number() }),
  z.object({ type: z.literal('ON_DESGASTE') }),
  z.object({ type: z.literal('ON_FIELD_CHANGE') }),
  z.object({ type: z.literal('ON_STATUS'), status }),
  z.object({ type: z.literal('ON_ALLY_DEFEATED') }),
  z.object({ type: z.literal('ON_DEFEATED') }),
])

export const passiveEffectSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('IGNORE_SHIELD') }),
  z.object({
    type: z.literal('REDUCE_COOLDOWN'),
    amount: z.number().int(),
    scope: z.enum(['RECHARGING', 'ALL']),
  }),
  z.object({
    type: z.literal('APPLY_STATUS'),
    status,
    target: z.enum(['SELF', 'ATTACKER', 'TARGET']),
    chance: z.number(),
  }),
  z.object({ type: z.literal('HEAL'), percentOfMaxHp: z.number() }),
  z.object({ type: z.literal('ADVANCE_TURN'), percent: z.number() }),
  z.object({ type: z.literal('ADVANCE_ALLIES'), percent: z.number() }),
  z.object({ type: z.literal('REDUCE_DAMAGE'), percent: z.number() }),
  z.object({ type: z.literal('STAT_MODIFIER'), stat, percent: z.number() }),
])

export const passiveSchema = z.object({
  name,
  description: z.string().max(1000),
  trigger: passiveTriggerSchema,
  effects: z.array(passiveEffectSchema),
})

/** A quem o efeito se aplica (padrão: aos alvos da skill). */
const appliesTo = z.enum(['TARGET', 'SELF']).optional()

export const skillEffectSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('DAMAGE'), power: z.number(), appliesTo }),
  z.object({ type: z.literal('HEAL'), power: z.number(), appliesTo }),
  z.object({ type: z.literal('SHIELD'), power: z.number(), appliesTo }),
  z.object({
    type: z.literal('STAT_MODIFIER'),
    stat,
    percent: z.number(),
    duration: z.number().int(),
    appliesTo,
  }),
  z.object({
    type: z.literal('APPLY_STATUS'),
    status,
    duration: z.number().int(),
    baseChance: z.number(),
    appliesTo,
  }),
  z.object({
    type: z.literal('REPOSITION'),
    kind: z.enum(['PUSH', 'PULL', 'SWAP', 'MOVE_ALLY', 'DASH']),
    appliesTo,
  }),
  z.object({ type: z.literal('TURN_SHIFT'), percent: z.number(), appliesTo }),
  z.object({
    type: z.literal('CHANGE_FIELD'),
    duration: z.number().int(),
    multiplier: z.number(),
    appliesTo,
  }),
  z.object({ type: z.literal('RECOVER'), appliesTo }),
  z.object({ type: z.literal('PROTECT'), appliesTo }),
  z.object({
    type: z.literal('GRANT_TURN'),
    attackPercent: z.number().optional(),
    appliesTo,
  }),
  z.object({
    type: z.literal('EXPLOIT'),
    status,
    multiplier: z.number(),
    consume: z.boolean(),
    appliesTo,
  }),
])

const variantSchema = z.object({
  name,
  lineage: z.nativeEnum(Lineage),
  description,
  awakensFromKey: optionalKey,
})

const traitSchema = z.object({
  name,
  description,
  category: z.nativeEnum(TraitCategory),
  source: z.nativeEnum(TraitSource),
  variantKey: optionalKey,
  effects: z.array(traitEffectSchema),
})

const templateSchema = z.object({
  name,
  description,
  characterClass: z.nativeEnum(CharacterClass),
  rarity: z.nativeEnum(Rarity),
  initialDanger: z.nativeEnum(DangerLevel),
  exclusivity: z.nativeEnum(Exclusivity),
  variants: z.array(
    z.object({ variantKey: catalogKeySchema, isPrimary: z.boolean() })
  ),
  familyTraitKey: optionalKey,
  stats: statBlockSchema,
  passive: passiveSchema,
})

const skillSchema = z.object({
  name,
  description,
  variantKey: optionalKey,
  tier: z.nativeEnum(SkillTier),
  target: z.nativeEnum(SkillTarget),
  range: z.nativeEnum(SkillRange).nullish(),
  area: z.nativeEnum(SkillArea),
  cooldown: z.number().int(),
  desgastePercent: z.number(),
  baseHitChance: z.number().nullish(),
  minLevel: z.number().int(),
  kitClass: z.nativeEnum(CharacterClass).nullish(),
  kitSlot: z.nativeEnum(SkillKitSlot).nullish(),
  effects: z.array(skillEffectSchema),
})

const fieldSchema = z.object({
  name,
  description,
  requiredTraitKeys: z.array(catalogKeySchema),
  primaryStat: stat,
  secondaryStat: stat,
  primaryPercent: z.number().optional(),
  secondaryPercent: z.number().optional(),
})

const npcSquadSchema = z.object({
  name,
  description,
  profile: z.nativeEnum(AiProfile),
  difficulty: z.nativeEnum(AiDifficulty),
  members: z.array(
    gridPositionSchema.extend({
      templateKey: catalogKeySchema,
      level: z.number().int(),
      awakenedVariantKey: optionalKey,
      skillKeys: z.array(catalogKeySchema),
      traitKeys: z.array(catalogKeySchema).optional(),
    })
  ),
})

/** Tipo do item pelo pedaço da URL (`/admin/variants`, `/admin/npc-squads`...). */
export const CATALOG_COLLECTIONS = {
  variants: 'VARIANT',
  traits: 'TRAIT',
  templates: 'TEMPLATE',
  skills: 'SKILL',
  fields: 'FIELD',
  'npc-squads': 'NPC_SQUAD',
} as const satisfies Record<string, CatalogKind>

export type CatalogCollection = keyof typeof CATALOG_COLLECTIONS

export const catalogCollectionSchema = z
  .enum(Object.keys(CATALOG_COLLECTIONS) as [CatalogCollection])
  .transform((collection) => CATALOG_COLLECTIONS[collection])

/** Corpo da edição (`PUT`) de cada tipo: sem a `key`, que vem da URL e não muda. */
export const catalogBodySchemas = {
  VARIANT: variantSchema,
  TRAIT: traitSchema,
  TEMPLATE: templateSchema,
  SKILL: skillSchema,
  FIELD: fieldSchema,
  NPC_SQUAD: npcSquadSchema,
} satisfies Record<CatalogKind, z.ZodTypeAny>
