import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { CreateSkillInput, Skill } from '@/domain/skills/entities/skill'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { SkillTier } from '@/domain/skills/enums/skill-tier'

/** Básica corpo a corpo de alvo único, nos valores de referência (D92). */
export function makeSkillInput(
  override: Partial<CreateSkillInput> = {}
): CreateSkillInput {
  return {
    key: 'strike',
    name: 'Golpe',
    tier: SkillTier.BASIC,
    target: SkillTarget.ENEMY,
    range: SkillRange.MELEE,
    area: SkillArea.SINGLE,
    cooldown: 0,
    desgastePercent: 1,
    baseHitChance: 0.8,
    minLevel: 0,
    effects: [{ type: 'DAMAGE', power: 0.8 }],
    ...override,
  }
}

export function makeSkill(
  override: Partial<CreateSkillInput> = {},
  id?: UniqueEntityId
): Skill {
  const result = Skill.create(makeSkillInput(override), id)

  if (result.isLeft()) throw result.value

  return result.value
}
