import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { AiDifficulty, NPC_LEVEL_RANGE } from '@/domain/ai/enums/ai-difficulty'
import { AiProfile } from '@/domain/ai/enums/ai-profile'
import { CharacterTemplate } from '@/domain/characters/entities/character-template'
import { Trait } from '@/domain/characters/entities/trait'
import { Variant } from '@/domain/characters/entities/variant'
import { TraitSource } from '@/domain/characters/enums/trait-source'
import { awakeningError } from '@/domain/characters/services/awakening-rules'
import { BUILD_SIZE } from '@/domain/characters/services/basic-kit'
import { skillEligibilityError } from '@/domain/characters/services/skill-eligibility'
import {
  MAX_TRAITS,
  statsOverTraitCap,
} from '@/domain/characters/services/trait-rules'
import { Skill } from '@/domain/skills/entities/skill'
import { InvalidNpcSquadError } from '../errors/invalid-npc-squad-error'
import {
  GridPosition,
  isInsideGrid,
  positionKey,
} from '../value-objects/grid-position'
import { SQUAD_SIZE } from './squad'

/** Personagem da máquina: modelo + nível + build, sem conta (D90, D103). */
export interface NpcSquadMember extends GridPosition {
  templateId: UniqueEntityId
  level: number
  awakenedVariantId: UniqueEntityId | null
  /** As 4 skills de batalha, na ordem dos slots. */
  skillIds: UniqueEntityId[]
  /** Até 5, incluindo o de família do modelo. */
  traitIds: UniqueEntityId[]
}

export interface NpcSquadProps {
  key: string
  name: string
  description?: string | null
  profile: AiProfile
  difficulty: AiDifficulty
  members: NpcSquadMember[]
}

export interface NpcSquadMemberInput extends GridPosition {
  template: CharacterTemplate
  level: number
  awakenedVariant?: Variant | null
  skills: Skill[]
  /** Inclui o traço de família quando o modelo tem. */
  traits?: Trait[]
}

export interface CreateNpcSquadInput extends Omit<NpcSquadProps, 'members'> {
  members: NpcSquadMemberInput[]
}

/**
 * Squad da máquina (catálogo; no MVP vem do seed.ts, depois do admin). Joga com as mesmas regras do jogador:
 * 4 personagens, grade 3x3, 4 skills cada. Pontos livres não são guardados: o motor usa a distribuição padrão
 * do perfil do modelo.
 */
export class NpcSquad extends Entity<NpcSquadProps> {
  get key() {
    return this.props.key
  }

  get name() {
    return this.props.name
  }

  get description() {
    return this.props.description ?? null
  }

  get profile() {
    return this.props.profile
  }

  get difficulty() {
    return this.props.difficulty
  }

  get members(): readonly NpcSquadMember[] {
    return this.props.members
  }

  static create(
    input: CreateNpcSquadInput,
    id?: UniqueEntityId
  ): Either<InvalidNpcSquadError, NpcSquad> {
    const error = validateMembers(input.difficulty, input.members)
    if (error) return left(new InvalidNpcSquadError(error))

    return right(
      new NpcSquad(
        {
          key: input.key,
          name: input.name,
          description: input.description ?? null,
          profile: input.profile,
          difficulty: input.difficulty,
          members: input.members.map(toMember),
        },
        id
      )
    )
  }
}

function toMember(input: NpcSquadMemberInput): NpcSquadMember {
  return {
    templateId: input.template.id,
    level: input.level,
    row: input.row,
    column: input.column,
    awakenedVariantId: input.awakenedVariant?.id ?? null,
    skillIds: input.skills.map((s) => s.id),
    traitIds: (input.traits ?? []).map((t) => t.id),
  }
}

function validateMembers(
  difficulty: AiDifficulty,
  members: NpcSquadMemberInput[]
): string | null {
  if (members.length !== SQUAD_SIZE) {
    return `o squad tem ${SQUAD_SIZE} personagens`
  }

  const templates = new Set(members.map((m) => m.template.id.toValue()))
  if (templates.size !== members.length) {
    return 'modelo repetido (mesma regra da conta do jogador)'
  }

  if (members.some((m) => !isInsideGrid(m))) {
    return 'célula fora da grade 3x3'
  }

  if (new Set(members.map(positionKey)).size !== members.length) {
    return 'dois personagens na mesma célula'
  }

  for (const member of members) {
    const error = validateMember(difficulty, member)
    if (error) return `${member.template.key}: ${error}`
  }

  return null
}

function validateMember(
  difficulty: AiDifficulty,
  member: NpcSquadMemberInput
): string | null {
  const range = NPC_LEVEL_RANGE[difficulty]
  if (
    !Number.isInteger(member.level) ||
    member.level < range.min ||
    member.level > range.max
  ) {
    return `nível ${member.level} fora de ${range.min} a ${range.max} (${difficulty})`
  }

  if (member.awakenedVariant) {
    const error = awakeningError(
      member.awakenedVariant,
      member.template,
      member.level
    )
    if (error) return error
  }

  if (member.skills.length !== BUILD_SIZE) {
    return `a build tem ${BUILD_SIZE} skills`
  }

  if (new Set(member.skills.map((s) => s.id.toValue())).size !== BUILD_SIZE) {
    return 'skill repetida na build'
  }

  for (const skill of member.skills) {
    const error = skillEligibilityError(skill, {
      template: member.template,
      level: member.level,
      awakenedVariantId: member.awakenedVariant?.id ?? null,
    })
    if (error) return error
  }

  const traits = member.traits ?? []
  if (traits.length > MAX_TRAITS) return `no máximo ${MAX_TRAITS} traços`

  if (new Set(traits.map((t) => t.id.toValue())).size !== traits.length) {
    return 'traço repetido'
  }

  const familyId = member.template.familyTraitId
  const templateTraits = traits.filter((t) => t.source === TraitSource.TEMPLATE)
  const hasOnlyOwnFamily =
    templateTraits.length === (familyId ? 1 : 0) &&
    templateTraits.every((t) => familyId && t.id.equals(familyId))

  if (!hasOnlyOwnFamily) {
    return 'o traço de família do modelo é obrigatório e o único TEMPLATE'
  }

  const overCap = statsOverTraitCap(traits)
  if (overCap.length > 0) {
    return `traços passam do teto em ${overCap.join(', ')}`
  }

  return null
}
