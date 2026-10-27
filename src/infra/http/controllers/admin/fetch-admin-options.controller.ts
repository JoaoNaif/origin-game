import { Controller, Get } from '@nestjs/common'
import { AiDifficulty, NPC_LEVEL_RANGE } from '@/domain/ai/enums/ai-difficulty'
import { AiProfile } from '@/domain/ai/enums/ai-profile'
import { MAX_VARIANTS } from '@/domain/characters/entities/character-template'
import {
  CharacterClass,
  CLASS_BUDGET,
  CLASS_BUDGET_TOLERANCE,
} from '@/domain/characters/enums/character-class'
import { DangerLevel } from '@/domain/characters/enums/danger-level'
import { Exclusivity } from '@/domain/characters/enums/exclusivity'
import { Lineage } from '@/domain/characters/enums/lineage'
import { Rarity } from '@/domain/characters/enums/rarity'
import { Stat } from '@/domain/characters/enums/stat'
import { TraitCategory } from '@/domain/characters/enums/trait-category'
import { TraitSource } from '@/domain/characters/enums/trait-source'
import { BUILD_SIZE } from '@/domain/characters/services/basic-kit'
import {
  MAX_TRAITS,
  TRAIT_STAT_CAP_PERCENT,
} from '@/domain/characters/services/trait-rules'
import {
  FIELD_PRIMARY_PERCENT,
  FIELD_SECONDARY_PERCENT,
  MAX_FIELD_TRAITS,
  MIN_FIELD_TRAITS,
} from '@/domain/combat/entities/battle-field'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillKitSlot } from '@/domain/skills/enums/skill-kit-slot'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import {
  AWAKENED_MIN_LEVEL,
  MAX_SKILL_POWER,
  SKILL_TIER_REFERENCE,
  SkillTier,
} from '@/domain/skills/enums/skill-tier'
import { StatusType } from '@/domain/skills/enums/status-type'
import { Admin } from '@/infra/auth/admin'
import {
  passiveEffectSchema,
  passiveTriggerSchema,
  skillEffectSchema,
  traitEffectSchema,
} from '../../schemas/catalog'

const values = (enumObject: Record<string, string>) => Object.values(enumObject)

const types = (schema: {
  options: readonly { shape: { type: { value: string } } }[]
}) => schema.options.map((option) => option.shape.type.value)

/**
 * GET /admin/options — as listas e os limites que a tela do admin usa (selects e dicas), para o front não repetir as
 * regras. Os campos de cada tipo de efeito estão em `docs/api.md`.
 */
@Controller('admin/options')
@Admin()
export class FetchAdminOptionsController {
  @Get()
  handle() {
    return {
      options: {
        lineages: values(Lineage),
        characterClasses: values(CharacterClass),
        rarities: values(Rarity),
        dangerLevels: values(DangerLevel),
        exclusivities: values(Exclusivity),
        stats: values(Stat),
        traitCategories: values(TraitCategory),
        traitSources: values(TraitSource),
        skillTiers: values(SkillTier),
        skillTargets: values(SkillTarget),
        skillRanges: values(SkillRange),
        skillAreas: values(SkillArea),
        skillKitSlots: values(SkillKitSlot),
        statusTypes: values(StatusType),
        aiProfiles: values(AiProfile),
        aiDifficulties: values(AiDifficulty),
        effectTypes: {
          trait: types(traitEffectSchema),
          skill: types(skillEffectSchema),
          passiveTrigger: types(passiveTriggerSchema),
          passiveEffect: types(passiveEffectSchema),
        },
        rules: {
          classBudget: CLASS_BUDGET,
          classBudgetTolerance: CLASS_BUDGET_TOLERANCE,
          skillTierReference: SKILL_TIER_REFERENCE,
          maxSkillPower: MAX_SKILL_POWER,
          awakenedMinLevel: AWAKENED_MIN_LEVEL,
          npcLevelRange: NPC_LEVEL_RANGE,
          buildSize: BUILD_SIZE,
          maxTemplateVariants: MAX_VARIANTS,
          maxTraits: MAX_TRAITS,
          traitStatCapPercent: TRAIT_STAT_CAP_PERCENT,
          fieldTraits: { min: MIN_FIELD_TRAITS, max: MAX_FIELD_TRAITS },
          fieldPercent: {
            primary: FIELD_PRIMARY_PERCENT,
            secondary: FIELD_SECONDARY_PERCENT,
          },
        },
      },
    }
  }
}
