import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { CharacterClass } from '@/domain/characters/enums/character-class'
import { DangerLevel } from '@/domain/characters/enums/danger-level'
import { Lineage } from '@/domain/characters/enums/lineage'
import { Rarity } from '@/domain/characters/enums/rarity'
import { MAX_LEVEL } from '@/domain/characters/services/level-curve'
import { SQUAD_SIZE } from '@/domain/squads/entities/squad'
import { EXHAUSTION_AFTER_ROUND } from '@/domain/combat/services/battle-end'
import { EVENT_LIMITS } from '../event-values'
import { EventKind } from '../enums/event-kind'
import { EventPhase } from '../enums/event-phase'
import { EventSquadMode } from '../enums/event-squad-mode'
import { InvalidEventError } from '../errors/invalid-event-error'
import { EventModifier } from '../value-objects/event-modifier'
import { EventRequirement } from '../value-objects/event-requirement'
import { EventReward } from '../value-objects/event-reward'

/** Limite de tentativas: `count` por dia (UTC) ou no evento inteiro. Nulo = à vontade. */
export interface EventAttemptLimit {
  count: number
  per: 'DAY' | 'EVENT'
}

/** Uma etapa: uma batalha contra um squad de NPC (piso da torre, alvo da caça, o chefe). */
export interface EventStage {
  /** Nome exibido (ex.: "Piso 3"). */
  name: string
  npcSquadKey: string
  /** Prêmio ao vencer a etapa (pequeno perto do principal, `events_brief.md` 5). */
  rewards: EventReward[]
  /** Caça: a besta que a vitória pode capturar (5.1). Só na caça, e nunca sagrada. */
  captureBeastKey?: string | null
}

export interface EventTemplateProps {
  key: string
  name: string
  description?: string | null
  kind: EventKind
  /** A partir daqui o jogador vê ("começa em..."), sem entrar. */
  announceAt: Date
  startsAt: Date
  /** Sempre tem fim (D155). */
  endsAt: Date
  requirements: EventRequirement[]
  attemptLimit: EventAttemptLimit | null
  squadMode: EventSquadMode
  /** Campo fixo (pesquisa); nulo = sorteado como no PvE (D112). */
  fieldKey: string | null
  modifiers: EventModifier[]
  /** Em sequência: só se joga a próxima depois de vencer a anterior. */
  stages: EventStage[]
  /** Ao vencer a última etapa (o prêmio principal). */
  completionRewards: EventReward[]
  /** Na primeira batalha terminada no evento, vença ou perca (desistir não conta). */
  participationRewards: EventReward[]
}

const RARITIES = Object.values(Rarity)
const LINEAGES = Object.values(Lineage)
const CLASSES = Object.values(CharacterClass)
const DANGERS = Object.values(DangerLevel)

/**
 * Evento do catálogo (admin, D155, `events_brief.md`): momento raro, sempre com fim. O código oferece os tipos, os
 * requisitos, os modificadores e as formas de prêmio; o admin combina. As ligações (squads de NPC, campo, prêmios) vão
 * pela `key` e o catálogo confere que existem (`catalogIntegrityError`).
 */
export class EventTemplate extends Entity<EventTemplateProps> {
  get key() {
    return this.props.key
  }

  get name() {
    return this.props.name
  }

  get description() {
    return this.props.description ?? null
  }

  get kind() {
    return this.props.kind
  }

  get announceAt() {
    return this.props.announceAt
  }

  get startsAt() {
    return this.props.startsAt
  }

  get endsAt() {
    return this.props.endsAt
  }

  get requirements(): readonly EventRequirement[] {
    return this.props.requirements
  }

  get attemptLimit(): Readonly<EventAttemptLimit> | null {
    return this.props.attemptLimit
  }

  get squadMode() {
    return this.props.squadMode
  }

  get fieldKey() {
    return this.props.fieldKey
  }

  get modifiers(): readonly EventModifier[] {
    return this.props.modifiers
  }

  get stages(): readonly EventStage[] {
    return this.props.stages
  }

  get completionRewards(): readonly EventReward[] {
    return this.props.completionRewards
  }

  get participationRewards(): readonly EventReward[] {
    return this.props.participationRewards
  }

  /** Momento do evento pelas datas. */
  phaseAt(now: Date): EventPhase {
    const t = now.getTime()
    if (t < this.props.announceAt.getTime()) return EventPhase.HIDDEN
    if (t < this.props.startsAt.getTime()) return EventPhase.ANNOUNCED
    if (t < this.props.endsAt.getTime()) return EventPhase.OPEN
    return EventPhase.ENDED
  }

  isOpenAt(now: Date): boolean {
    return this.phaseAt(now) === EventPhase.OPEN
  }

  /** Todos os prêmios do evento (etapas, conclusão e participação), para conferir as `keys`. */
  get allRewards(): EventReward[] {
    return [
      ...this.props.stages.flatMap((s) => s.rewards),
      ...this.props.completionRewards,
      ...this.props.participationRewards,
    ]
  }

  static create(
    input: EventTemplateProps,
    id?: UniqueEntityId
  ): Either<InvalidEventError, EventTemplate> {
    const props: EventTemplateProps = {
      ...input,
      description: input.description ?? null,
      announceAt: new Date(input.announceAt),
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      requirements: input.requirements.map((r) => ({ ...r })),
      attemptLimit: input.attemptLimit ? { ...input.attemptLimit } : null,
      fieldKey: input.fieldKey ?? null,
      modifiers: input.modifiers.map((m) => ({ ...m })),
      stages: input.stages.map((s) => ({
        ...s,
        rewards: s.rewards.map((r) => ({ ...r })),
        captureBeastKey: s.captureBeastKey ?? null,
      })),
      completionRewards: input.completionRewards.map((r) => ({ ...r })),
      participationRewards: input.participationRewards.map((r) => ({ ...r })),
    }

    const error = validate(props)
    if (error) return left(new InvalidEventError(error))

    return right(new EventTemplate(props, id))
  }
}

function validate(props: EventTemplateProps): string | null {
  if (!props.name.trim()) return 'o nome é obrigatório'
  if (!Object.values(EventKind).includes(props.kind)) return 'tipo desconhecido'
  if (!Object.values(EventSquadMode).includes(props.squadMode)) {
    return 'modo do squad desconhecido'
  }

  const dates = [props.announceAt, props.startsAt, props.endsAt]
  if (dates.some((d) => Number.isNaN(d.getTime()))) return 'data inválida'
  if (props.announceAt.getTime() > props.startsAt.getTime()) {
    return 'o anúncio vem antes (ou junto) do início'
  }
  if (props.startsAt.getTime() >= props.endsAt.getTime()) {
    return 'o fim vem depois do início (o evento sempre tem fim)'
  }

  const limit = props.attemptLimit
  if (
    limit &&
    (!Number.isInteger(limit.count) ||
      limit.count < 1 ||
      limit.count > EVENT_LIMITS.maxAttempts ||
      !['DAY', 'EVENT'].includes(limit.per))
  ) {
    return `tentativas de 1 a ${EVENT_LIMITS.maxAttempts}, por dia ou no evento`
  }

  if (props.stages.length < 1 || props.stages.length > EVENT_LIMITS.maxStages) {
    return `de 1 a ${EVENT_LIMITS.maxStages} etapas`
  }
  for (const [index, stage] of props.stages.entries()) {
    if (!stage.name.trim()) return `etapa ${index + 1}: o nome é obrigatório`
    if (!stage.npcSquadKey) return `etapa ${index + 1}: falta o squad de NPC`
    const error = rewardsError(stage.rewards)
    if (error) return `etapa ${index + 1}: ${error}`
  }

  const rewards =
    rewardsError(props.completionRewards) ??
    rewardsError(props.participationRewards)
  if (rewards) return rewards

  if (props.requirements.length > EVENT_LIMITS.maxRequirements) {
    return `no máximo ${EVENT_LIMITS.maxRequirements} requisitos`
  }
  for (const requirement of props.requirements) {
    const error = requirementError(requirement)
    if (error) return error
  }

  const modifierTypes = props.modifiers.map((m) => m.type)
  if (new Set(modifierTypes).size !== modifierTypes.length) {
    return 'modificador repetido'
  }
  for (const modifier of props.modifiers) {
    const error = modifierError(modifier)
    if (error) return error
  }

  return kindError(props)
}

/** Regras próprias de cada tipo (`events_brief.md` 5). */
function kindError(props: EventTemplateProps): string | null {
  const captures = props.stages.filter((s) => s.captureBeastKey)

  switch (props.kind) {
    case EventKind.HUNT:
      if (captures.length !== props.stages.length) {
        return 'na caça, toda etapa tem a besta a capturar'
      }
      return null
    case EventKind.UNIQUE_BOSS:
      if (props.stages.length !== 1) return 'o chefe único é uma etapa só'
      if (
        props.attemptLimit?.count !== 1 ||
        props.attemptLimit.per !== 'EVENT'
      ) {
        return 'o chefe único tem uma tentativa só no evento (1 por EVENT)'
      }
      break
    case EventKind.CHARACTER_LAUNCH:
      if (
        ![
          ...props.completionRewards,
          ...props.stages.flatMap((s) => s.rewards),
        ].some((r) => r.type === 'CHARACTER')
      ) {
        return 'o lançamento dá o personagem (prêmio CHARACTER)'
      }
      break
    case EventKind.RESEARCH:
      if (props.modifiers.length === 0 && !props.fieldKey) {
        return 'a pesquisa tem ao menos um modificador ou o campo fixo'
      }
      break
    case EventKind.TOWER:
      break
  }

  return captures.length > 0 ? 'captura de besta só na caça' : null
}

function rewardsError(rewards: readonly EventReward[]): string | null {
  if (rewards.length > EVENT_LIMITS.maxRewardsPerList) {
    return `no máximo ${EVENT_LIMITS.maxRewardsPerList} prêmios por lista`
  }

  for (const reward of rewards) {
    switch (reward.type) {
      case 'COINS':
        if (
          !Number.isInteger(reward.amount) ||
          reward.amount < 1 ||
          reward.amount > EVENT_LIMITS.maxCoins
        ) {
          return `moeda de 1 a ${EVENT_LIMITS.maxCoins}`
        }
        break
      case 'FRAGMENTS':
        if (!LINEAGES.includes(reward.lineage)) return 'tipo de fragmento'
        if (
          !Number.isInteger(reward.amount) ||
          reward.amount < 1 ||
          reward.amount > EVENT_LIMITS.maxFragments
        ) {
          return `fragmentos de 1 a ${EVENT_LIMITS.maxFragments}`
        }
        break
      case 'CHEST':
        if (!RARITIES.includes(reward.tier)) return 'nível do baú desconhecido'
        break
      case 'CHARACTER':
        if (!reward.templateKey) return 'prêmio de personagem sem modelo'
        break
      case 'GEAR':
        if (!reward.gearKey) return 'prêmio de equipamento sem modelo'
        break
      case 'BEAST':
        if (!reward.beastKey) return 'prêmio de besta sem modelo'
        break
      default:
        return 'tipo de prêmio desconhecido'
    }
  }

  return null
}

function requirementError(requirement: EventRequirement): string | null {
  const count = (min: number) =>
    Number.isInteger(min) && min >= 1 && min <= SQUAD_SIZE
      ? null
      : `quantidade de 1 a ${SQUAD_SIZE}`

  switch (requirement.type) {
    case 'MIN_LEVEL':
      return Number.isInteger(requirement.level) &&
        requirement.level >= 1 &&
        requirement.level <= MAX_LEVEL
        ? null
        : `nível mínimo de 1 a ${MAX_LEVEL}`
    case 'CLASS_COUNT':
      if (!CLASSES.includes(requirement.characterClass)) {
        return 'classe desconhecida'
      }
      return count(requirement.min)
    case 'LINEAGE':
      if (!LINEAGES.includes(requirement.lineage)) {
        return 'linhagem desconhecida'
      }
      return count(requirement.min)
    case 'FAMILY':
      if (!requirement.traitKey) return 'requisito de família sem traço'
      return count(requirement.min)
    case 'MIN_DANGER':
      return DANGERS.includes(requirement.level)
        ? null
        : 'periculosidade desconhecida'
    case 'MAX_RARITY':
      return RARITIES.includes(requirement.rarity)
        ? null
        : 'raridade desconhecida'
    default:
      return 'tipo de requisito desconhecido'
  }
}

function modifierError(modifier: EventModifier): string | null {
  switch (modifier.type) {
    case 'LEVELED_STATS':
      return Number.isInteger(modifier.level) &&
        modifier.level >= 1 &&
        modifier.level <= MAX_LEVEL
        ? null
        : `nível dos stats nivelados de 1 a ${MAX_LEVEL}`
    case 'EARLY_EXHAUSTION':
      return Number.isInteger(modifier.afterRound) &&
        modifier.afterRound >= 0 &&
        modifier.afterRound < EXHAUSTION_AFTER_ROUND
        ? null
        : `Exaustão mais cedo: depois da rodada 0 a ${EXHAUSTION_AFTER_ROUND - 1}`
    case 'NO_HEALING':
    case 'EQUAL_SPEED':
      return null
    default:
      return 'modificador desconhecido'
  }
}
