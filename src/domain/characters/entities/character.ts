import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Account } from '@/domain/accounts/entities/account'
import { Skill } from '@/domain/skills/entities/skill'
import { CharacterSkillSource } from '../enums/character-skill-source'
import { DangerLevel } from '../enums/danger-level'
import { Stat } from '../enums/stat'
import { TraitSource } from '../enums/trait-source'
import { InvalidCharacterError } from '../errors/invalid-character-error'
import { awakeningError } from '../services/awakening-rules'
import {
  availableFreePoints,
  maxFreePointsPerStat,
} from '../services/free-points'
import { BUILD_SIZE, validateBasicKit } from '../services/basic-kit'
import { MAX_LEVEL, xpToNextLevel } from '../services/level-curve'
import { skillEligibilityError } from '../services/skill-eligibility'
import {
  MAX_TRAITS,
  statsOverTraitCap,
  TRAIT_STAT_CAP_PERCENT,
} from '../services/trait-rules'
import { LearnedSkill } from '../value-objects/learned-skill'
import { StatBlock } from '../value-objects/stat-block'
import { CharacterTemplate } from './character-template'
import { Trait } from './trait'
import { Variant } from './variant'

export const EMPTY_FREE_POINTS: StatBlock = {
  HP: 0,
  ATTACK: 0,
  DEFENSE: 0,
  SPEED: 0,
  PRECISION: 0,
  EVASION: 0,
  WILL: 0,
}

export interface CharacterProps {
  accountId: UniqueEntityId
  templateId: UniqueEntityId
  level: number
  /** XP dentro do nível atual (sempre menor que o custo do próximo nível). */
  xp: number
  danger: DangerLevel
  dangerPoints: number
  /** Variante despertada (D67, D96); nulo = não despertou. */
  awakenedVariantId: UniqueEntityId | null
  /** Pontos livres por stat (HP em pontos: 1 ponto = 5 de HP). */
  freePoints: StatBlock
  /** Até 5, incluindo o de família copiado do modelo. */
  traits: Trait[]
  /** Skills aprendidas (kit + escolhidas); as que têm `buildSlot` formam a build de 4. */
  skills: LearnedSkill[]
}

export interface CreateCharacterInput {
  account: Account
  template: CharacterTemplate
  /** Obrigatório quando o modelo tem família; é copiado para a lista de traços. */
  familyTrait?: Trait | null
  /** As 4 skills do kit básico do modelo (classe + variantes); entram aprendidas e na build. */
  kitSkills: Skill[]
}

/** Instância do personagem: a Yuki da conta, com nível, pontos livres e traços próprios. */
export class Character extends Entity<CharacterProps> {
  get accountId() {
    return this.props.accountId
  }

  get templateId() {
    return this.props.templateId
  }

  get level() {
    return this.props.level
  }

  get xp() {
    return this.props.xp
  }

  get danger() {
    return this.props.danger
  }

  get dangerPoints() {
    return this.props.dangerPoints
  }

  get awakenedVariantId() {
    return this.props.awakenedVariantId
  }

  get isAwakened() {
    return this.props.awakenedVariantId !== null
  }

  get freePoints(): Readonly<StatBlock> {
    return this.props.freePoints
  }

  get traits(): readonly Trait[] {
    return this.props.traits
  }

  get skills(): readonly LearnedSkill[] {
    return this.props.skills
  }

  /** As 4 skills de batalha, na ordem dos slots. */
  get build(): readonly LearnedSkill[] {
    return this.props.skills
      .filter((s) => s.buildSlot !== null)
      .sort((a, b) => (a.buildSlot ?? 0) - (b.buildSlot ?? 0))
  }

  /** Cria um personagem novo na conta (nível 0), copiando o traço de família do modelo. */
  static create(
    input: CreateCharacterInput,
    id?: UniqueEntityId
  ): Either<InvalidCharacterError, Character> {
    const { account, template, familyTrait, kitSkills } = input
    const familyId = template.familyTraitId

    if (familyId && !familyTrait?.id.equals(familyId)) {
      return left(
        new InvalidCharacterError('informe o traço de família do modelo')
      )
    }

    if (!familyId && familyTrait) {
      return left(new InvalidCharacterError('o modelo não tem família'))
    }

    const kitError = validateBasicKit(template, kitSkills)
    if (kitError) return left(new InvalidCharacterError(kitError))

    return right(
      new Character(
        {
          accountId: account.id,
          templateId: template.id,
          level: 0,
          xp: 0,
          danger: template.initialDanger,
          dangerPoints: 0,
          awakenedVariantId: null,
          freePoints: { ...EMPTY_FREE_POINTS },
          traits: familyTrait ? [familyTrait] : [],
          skills: kitSkills.map((skill, index) => ({
            skill,
            source: CharacterSkillSource.KIT,
            isEnhanced: false,
            buildSlot: index + 1,
          })),
        },
        id
      )
    )
  }

  /** Recompõe um personagem já existente (ex.: vindo do banco), sem as regras de criação. */
  static restore(props: CharacterProps, id: UniqueEntityId): Character {
    return new Character(props, id)
  }

  /** Soma XP e sobe de nível conforme a curva (D92). Devolve quantos níveis subiu. */
  gainXp(amount: number): number {
    if (amount <= 0 || this.props.level >= MAX_LEVEL) return 0

    let levelsGained = 0
    this.props.xp += Math.floor(amount)

    while (
      this.props.level < MAX_LEVEL &&
      this.props.xp >= xpToNextLevel(this.props.level)
    ) {
      this.props.xp -= xpToNextLevel(this.props.level)
      this.props.level += 1
      levelsGained += 1
    }

    if (this.props.level >= MAX_LEVEL) this.props.xp = 0

    return levelsGained
  }

  /**
   * Aprende uma skill escolhida num bloco de ofertas (D77). Só das próprias variantes (ou none, sem variante),
   * com o nível mínimo atingido; a despertada só depois de despertar na variante dela (D96).
   */
  learnSkill(
    skill: Skill,
    template: CharacterTemplate
  ): Either<InvalidCharacterError, void> {
    if (!template.id.equals(this.props.templateId)) {
      return left(new InvalidCharacterError('modelo diferente do personagem'))
    }

    if (this.props.skills.some((s) => s.skill.id.equals(skill.id))) {
      return left(new InvalidCharacterError('o personagem já tem esta skill'))
    }

    const eligibility = skillEligibilityError(skill, {
      template,
      level: this.props.level,
      awakenedVariantId: this.props.awakenedVariantId,
    })
    if (eligibility) return left(new InvalidCharacterError(eligibility))

    this.props.skills.push({
      skill,
      source: CharacterSkillSource.OFFER,
      isEnhanced: false,
      buildSlot: null,
    })

    return right(undefined)
  }

  /** Monta a build de batalha (D43): exatamente 4 skills aprendidas, sem repetir, na ordem dos slots. */
  equipSkills(skillIds: UniqueEntityId[]): Either<InvalidCharacterError, void> {
    if (skillIds.length !== BUILD_SIZE) {
      return left(new InvalidCharacterError(`a build tem ${BUILD_SIZE} skills`))
    }

    if (new Set(skillIds.map((id) => id.toValue())).size !== skillIds.length) {
      return left(new InvalidCharacterError('skill repetida na build'))
    }

    const learned: LearnedSkill[] = []
    for (const id of skillIds) {
      const found = this.props.skills.find((s) => s.skill.id.equals(id))
      if (!found) {
        return left(
          new InvalidCharacterError('só skills aprendidas entram na build')
        )
      }
      learned.push(found)
    }

    for (const s of this.props.skills) s.buildSlot = null
    learned.forEach((s, index) => {
      s.buildSlot = index + 1
    })

    return right(undefined)
  }

  /** Marca a skill como aprimorada (D80). A chance e o custo da tentativa ficam no caso de uso (D100). */
  enhanceSkill(skillId: UniqueEntityId): Either<InvalidCharacterError, void> {
    const learned = this.props.skills.find((s) => s.skill.id.equals(skillId))

    if (!learned) {
      return left(new InvalidCharacterError('skill não aprendida'))
    }

    if (learned.isEnhanced) {
      return left(new InvalidCharacterError('um aprimoramento só por skill'))
    }

    learned.isEnhanced = true

    return right(undefined)
  }

  /** Adiciona um traço conquistado (meta ou evento). */
  addTrait(trait: Trait): Either<InvalidCharacterError, void> {
    if (trait.source !== TraitSource.CONQUERED) {
      return left(
        new InvalidCharacterError('traço de família só vem do modelo')
      )
    }

    if (this.props.traits.some((t) => t.id.equals(trait.id))) {
      return left(new InvalidCharacterError('o personagem já tem este traço'))
    }

    if (this.props.traits.length >= MAX_TRAITS) {
      return left(new InvalidCharacterError(`no máximo ${MAX_TRAITS} traços`))
    }

    const overCap = statsOverTraitCap([...this.props.traits, trait])
    if (overCap.length > 0) {
      return left(
        new InvalidCharacterError(
          `traços passam de +${TRAIT_STAT_CAP_PERCENT}% em ${overCap.join(', ')}`
        )
      )
    }

    this.props.traits.push(trait)

    return right(undefined)
  }

  /** Redistribui os pontos livres (grátis fora da batalha, D48), dentro do total e dos tetos da classe. */
  allocateFreePoints(
    allocation: StatBlock,
    template: CharacterTemplate
  ): Either<InvalidCharacterError, void> {
    if (!template.id.equals(this.props.templateId)) {
      return left(new InvalidCharacterError('modelo diferente do personagem'))
    }

    const values = Object.values(allocation)
    if (values.some((v) => !Number.isInteger(v) || v < 0)) {
      return left(
        new InvalidCharacterError('pontos livres inteiros e não negativos')
      )
    }

    const total = values.reduce((sum, v) => sum + v, 0)
    const available = availableFreePoints(this.props.level)
    if (total > available) {
      return left(
        new InvalidCharacterError(
          `${total} pontos usados, ${available} disponíveis no nível ${this.props.level}`
        )
      )
    }

    const caps = maxFreePointsPerStat(template.characterClass, template.stats)
    const overCap = (Object.keys(allocation) as Stat[]).filter(
      (stat) => allocation[stat] > caps[stat]
    )
    if (overCap.length > 0) {
      return left(
        new InvalidCharacterError(
          `acima do teto da classe em ${overCap.join(', ')}`
        )
      )
    }

    this.props.freePoints = { ...allocation }

    return right(undefined)
  }

  /** Desperta (D67, D96): só com exatamente 1 variante, a partir do nível 80, numa despertada dela. */
  awaken(
    variant: Variant,
    template: CharacterTemplate
  ): Either<InvalidCharacterError, void> {
    if (!template.id.equals(this.props.templateId)) {
      return left(new InvalidCharacterError('modelo diferente do personagem'))
    }

    if (this.isAwakened) {
      return left(new InvalidCharacterError('já despertou (um despertar só)'))
    }

    const error = awakeningError(variant, template, this.props.level)
    if (error) return left(new InvalidCharacterError(error))

    this.props.awakenedVariantId = variant.id

    return right(undefined)
  }
}
