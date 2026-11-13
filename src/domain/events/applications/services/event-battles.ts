import { Either, left, right } from '@/core/either'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { SeededRng } from '@/core/rng/seeded-rng'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { BeastGrade } from '@/domain/beasts/enums/beast-grade'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Character } from '@/domain/characters/entities/character'
import { BattlesRepository } from '@/domain/combat/applications/repositories/battles-repository'
import { Battle } from '@/domain/combat/entities/battle'
import { BattleEndReason, BattleSide } from '@/domain/combat/enums/battle-enums'
import { BattleSnapshot } from '@/domain/combat/value-objects/battle-snapshot'
import { EventEntry } from '../../entities/event-entry'
import { EventTemplate } from '../../entities/event-template'
import { EventKind } from '../../enums/event-kind'
import { huntCaptureChance } from '../../event-values'
import { InvalidEventError } from '../../errors/invalid-event-error'
import { applyEventModifiers } from '../../services/event-snapshot'
import {
  eventRequirementError,
  EventSquadMember,
} from '../../services/event-requirements'
import {
  EventBattleOutcome,
  EventRewardSource,
} from '../../value-objects/event-battle-outcome'
import { EventReward } from '../../value-objects/event-reward'
import { EventEntriesRepository } from '../repositories/event-entries-repository'
import { EventRewardsDeps, grantEventRewards } from './grant-event-rewards'

/** Sal da sorte da captura na caça (separada do motor, da IA e do loot). */
const CAPTURE_SEED_SALT = 0x3c6ef372

export interface EventBattleEntry {
  event: EventTemplate
  entry: EventEntry
  /** A participação ainda não existe no banco (primeira batalha do evento). */
  isNew: boolean
  /** A foto com os modificadores do evento (pesquisa). */
  snapshot: BattleSnapshot
}

export interface EnterEventBattleInput {
  accountId: string
  eventId: string
  stage: number
  /** Os personagens do squad escolhido, na ordem dos membros. */
  characters: readonly Character[]
  snapshot: BattleSnapshot
  catalog: GameCatalog
  now: Date
}

/**
 * Batalhas de evento (D155, `events_brief.md` 3 a 5): confere a entrada (evento aberto, etapa, tentativas, squad
 * travado, requisitos) quando a batalha começa e entrega o avanço e os prêmios quando ela termina. As batalhas em si
 * são as do PvE (mesmo motor, mesma IA); só o squad de NPC vem da etapa.
 */
export class EventBattles {
  constructor(
    private eventEntriesRepository: EventEntriesRepository,
    private accountsRepository: AccountsRepository,
    private battlesRepository: BattlesRepository,
    private rewardsDeps: EventRewardsDeps
  ) {}

  /** O evento do catálogo e a participação da conta (ainda sem gravar). */
  async findEntry(
    accountId: string,
    event: EventTemplate,
    now: Date
  ): Promise<{ entry: EventEntry; isNew: boolean }> {
    const found = await this.eventEntriesRepository.findByAccountAndEvent(
      accountId,
      event.id.toString()
    )
    if (found) return { entry: found, isNew: false }

    return {
      entry: EventEntry.create({
        accountId: new UniqueEntityId(accountId),
        eventId: event.id,
        createdAt: now,
      }),
      isNew: true,
    }
  }

  /** Confere tudo antes de a batalha do evento começar; não grava nada. */
  async enter(
    input: EnterEventBattleInput
  ): Promise<
    Either<ResourceNotFoundError | InvalidEventError, EventBattleEntry>
  > {
    const event = input.catalog.events.get(input.eventId)
    if (!event) return left(new ResourceNotFoundError('evento'))
    if (!event.isOpenAt(input.now)) {
      return left(new InvalidEventError('o evento não está aberto'))
    }

    const { entry, isNew } = await this.findEntry(
      input.accountId,
      event,
      input.now
    )
    const playError = entry.playError(event.attemptLimit, input.now)
    if (playError) return left(new InvalidEventError(playError))
    if (entry.clearedStages !== input.stage) {
      return left(
        new InvalidEventError(
          'a etapa mudou desde a pré-batalha: faça a pré-batalha de novo'
        )
      )
    }

    const characterIds = input.characters.map((c) => c.id.toString())
    const squad = entry.checkSquad(event.squadMode, characterIds)
    if (squad.isLeft()) return left(squad.value)

    const requirement = eventRequirementError(
      event.requirements,
      squadMembers(input.characters, input.snapshot, input.catalog)
    )
    if (requirement) return left(new InvalidEventError(requirement))

    return right({
      event,
      entry,
      isNew,
      snapshot: applyEventModifiers(input.snapshot, event.modifiers),
    })
  }

  /** A batalha começou: conta a tentativa (e trava o squad fixo) e grava a participação. */
  async recordAttempt(
    { event, entry, isNew }: EventBattleEntry,
    characterIds: readonly string[],
    now: Date
  ): Promise<void> {
    entry.recordAttempt(event.squadMode, characterIds, now)
    if (isNew) await this.eventEntriesRepository.create(entry)
    else await this.eventEntriesRepository.save(entry)
  }

  /**
   * Fim da batalha de evento: a participação (primeira batalha terminada, vença ou perca), a etapa vencida (na caça, só
   * se capturou a besta), os prêmios da etapa e, na última, os da conclusão. Desistir não conta (D136). Grava na
   * batalha (`eventOutcome`) uma vez só; nulo se não há o que entregar.
   */
  async deliver(
    battle: Battle,
    catalog: GameCatalog,
    now: Date
  ): Promise<EventBattleOutcome | null> {
    const link = battle.event
    if (!link || !battle.isFinished || battle.eventOutcome) return null
    if (battle.endReason === BattleEndReason.ABANDON) return null

    const event = catalog.events.get(link.eventId)
    const accountId = battle.accountId.toString()
    const [entry, account] = await Promise.all([
      this.eventEntriesRepository.findByAccountAndEvent(
        accountId,
        link.eventId
      ),
      this.accountsRepository.findById(accountId),
    ])
    if (!event || !entry || !account) return null

    const won = battle.winner === BattleSide.PLAYER
    const rewards: { reward: EventReward; source: EventRewardSource }[] = []
    const add = (list: readonly EventReward[], source: EventRewardSource) =>
      rewards.push(...list.map((reward) => ({ reward, source })))

    if (entry.markParticipated()) {
      add(event.participationRewards, 'PARTICIPATION')
    }

    const stage = event.stages[link.stage]
    let capture: EventBattleOutcome['capture'] = null
    let stageCleared = false
    let completed = false

    if (won && stage && !entry.isCompleted) {
      let captured = true
      if (event.kind === EventKind.HUNT && stage.captureBeastKey) {
        const beast = [...catalog.beastTemplates.values()].find(
          (b) => b.key === stage.captureBeastKey
        )
        const chance =
          beast && beast.grade !== BeastGrade.SACRED
            ? huntCaptureChance(beast.grade, entry.captureFailures)
            : 0
        const rng = new SeededRng((battle.seed ^ CAPTURE_SEED_SALT) >>> 0)
        captured = rng.chance(chance)
        capture = { beastKey: stage.captureBeastKey, chance, captured }
        if (captured) {
          rewards.push({
            reward: { type: 'BEAST', beastKey: stage.captureBeastKey },
            source: 'CAPTURE',
          })
        } else {
          entry.recordCaptureFailure()
        }
      }

      if (captured) {
        const before = entry.clearedStages
        completed = entry.clearStage(link.stage, event.stages.length, now)
        stageCleared = entry.clearedStages > before
        if (stageCleared) add(stage.rewards, 'STAGE')
        if (completed) add(event.completionRewards, 'COMPLETION')
      }
    }

    await this.eventEntriesRepository.save(entry)

    const granted = await grantEventRewards(
      {
        account,
        eventId: event.id,
        refId: battle.id.toString(),
        rewards: rewards.map((r) => r.reward),
        catalog,
        now,
      },
      this.rewardsDeps
    )

    const outcome: EventBattleOutcome = {
      eventKey: event.key,
      stage: link.stage,
      won,
      stageCleared,
      capture,
      completed,
      rewards: granted.map((g, index) => ({
        ...g,
        source: rewards[index].source,
      })),
    }

    if (battle.recordEventOutcome(outcome).isRight()) {
      await this.battlesRepository.saveRewards(battle)
    }

    return outcome
  }
}

/** O que os requisitos olham de cada personagem: nível, classe e linhagens da foto; raridade e periculosidade da ficha. */
function squadMembers(
  characters: readonly Character[],
  snapshot: BattleSnapshot,
  catalog: GameCatalog
): EventSquadMember[] {
  return snapshot.player.units.flatMap((unit) => {
    const character = characters.find(
      (c) => c.id.toString() === unit.characterId
    )
    const template = character
      ? catalog.templates.get(character.templateId.toValue())
      : undefined
    if (!character || !template) return []

    return [
      {
        name: unit.name,
        level: character.level,
        characterClass: unit.characterClass,
        lineages: unit.lineages,
        traitKeys: unit.traitKeys,
        rarity: template.rarity,
        danger: character.danger,
      },
    ]
  })
}
