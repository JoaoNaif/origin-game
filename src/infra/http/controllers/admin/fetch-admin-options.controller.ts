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
  AWAKENING_REQUIREMENTS,
  AwakeningRequirementLevel,
  MAX_REQUIREMENTS_PER_LEVEL,
} from '@/domain/characters/entities/awakening'
import {
  AWAKENING_MISSION_KINDS,
  AwakeningMissionCategory,
} from '@/domain/characters/enums/awakening-mission-kind'
import { AWAKENING_MISSION_RULES } from '@/domain/characters/services/awakening-missions'
import { KNOWN_TITLES } from '@/domain/characters/services/dom-rules'
import { GearGrade } from '@/domain/gear/enums/gear-grade'
import { BeastContract } from '@/domain/beasts/enums/beast-contract'
import { EventKind } from '@/domain/events/enums/event-kind'
import { EventSquadMode } from '@/domain/events/enums/event-squad-mode'
import {
  EVENT_LIMITS,
  HUNT_CAPTURE_CHANCE,
  HUNT_FAILURE_BONUS,
  REWARD_BOX_DAYS,
} from '@/domain/events/event-values'
import { BeastGrade } from '@/domain/beasts/enums/beast-grade'
import {
  BEAST_SKILL_COUNT,
  MASTER_REQUIREMENT_COUNT,
} from '@/domain/beasts/beast-values'
import { GearKind } from '@/domain/gear/enums/gear-kind'
import {
  GEAR_ADMIN_TUNING,
  GEAR_REQUIREMENT_COUNT,
  GEAR_STAT_PERCENTS,
  GEAR_TITLES,
} from '@/domain/gear/gear-values'
import {
  passiveEffectSchema,
  passiveTriggerSchema,
  skillEffectSchema,
  traitEffectSchema,
  eventRewardSchema,
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
        awakeningRequirementLevels: values(AwakeningRequirementLevel),
        awakeningMissionCategories: values(AwakeningMissionCategory),
        /** Os 11 tipos de missão (D151): categoria e limiar padrão. */
        awakeningMissionKinds: AWAKENING_MISSION_KINDS,
        gearGrades: values(GearGrade),
        gearKinds: values(GearKind),
        beastContracts: values(BeastContract),
        beastGrades: values(BeastGrade),
        eventKinds: values(EventKind),
        eventSquadModes: values(EventSquadMode),
        eventRequirementTypes: [
          'MIN_LEVEL',
          'CLASS_COUNT',
          'LINEAGE',
          'FAMILY',
          'MIN_DANGER',
          'MAX_RARITY',
        ],
        eventModifierTypes: [
          'LEVELED_STATS',
          'EARLY_EXHAUSTION',
          'NO_HEALING',
          'EQUAL_SPEED',
        ],
        eventRewardTypes: types(eventRewardSchema),
        /** Títulos que existem hoje (a lista do equipamento só aceita estes). */
        titles: KNOWN_TITLES,
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
          awakeningRequirements: {
            ...AWAKENING_REQUIREMENTS,
            maxPerLevel: MAX_REQUIREMENTS_PER_LEVEL,
          },
          awakeningMissionRules: AWAKENING_MISSION_RULES,
          gear: {
            statPercents: GEAR_STAT_PERCENTS,
            adminTuning: GEAR_ADMIN_TUNING,
            requirementCount: GEAR_REQUIREMENT_COUNT,
            titles: GEAR_TITLES,
          },
          beast: {
            skillCount: BEAST_SKILL_COUNT,
            masterRequirementCount: MASTER_REQUIREMENT_COUNT,
          },
          event: {
            limits: EVENT_LIMITS,
            huntCaptureChance: HUNT_CAPTURE_CHANCE,
            huntFailureBonus: HUNT_FAILURE_BONUS,
            rewardBoxDays: REWARD_BOX_DAYS,
          },
        },
      },
    }
  }
}
