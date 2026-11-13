import { EventEntry } from '@/domain/events/entities/event-entry'
import { EventTemplate } from '@/domain/events/entities/event-template'
import { EventKind } from '@/domain/events/enums/event-kind'
import {
  HUNT_CAPTURE_CHANCE,
  huntCaptureChance,
} from '@/domain/events/event-values'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'

/** Evento como o admin edita (o corpo do `PUT /admin/events/:key`, mais a `key`). */
function eventDefinition(event: EventTemplate) {
  return {
    key: event.key,
    name: event.name,
    description: event.description,
    kind: event.kind,
    announceAt: event.announceAt,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    requirements: event.requirements,
    attemptLimit: event.attemptLimit,
    squadMode: event.squadMode,
    fieldKey: event.fieldKey,
    modifiers: event.modifiers,
    stages: event.stages,
    completionRewards: event.completionRewards,
    participationRewards: event.participationRewards,
  }
}

export class EventPresenter {
  static admin(event: EventTemplate) {
    return eventDefinition(event)
  }

  /**
   * O evento para o jogador (D155): a definição, a fase pelas datas e o progresso da conta (etapa atual, tentativas
   * que sobram, squad travado, concluído). Na caça, a chance de captura da etapa atual.
   */
  static toHTTP(
    event: EventTemplate,
    entry: EventEntry | null,
    catalog: GameCatalog,
    now: Date
  ) {
    const stage = entry?.clearedStages ?? 0
    const current = event.stages[stage] ?? null
    const beast =
      event.kind === EventKind.HUNT && current?.captureBeastKey
        ? [...catalog.beastTemplates.values()].find(
            (b) => b.key === current.captureBeastKey
          )
        : undefined

    return {
      ...eventDefinition(event),
      phase: event.phaseAt(now),
      stages: event.stages.map((s, index) => ({
        ...s,
        npcSquadName:
          catalog.npcSquads.find((n) => n.key === s.npcSquadKey)?.name ?? null,
        cleared: index < stage,
      })),
      progress: {
        clearedStages: entry?.clearedStages ?? 0,
        totalStages: event.stages.length,
        nextStage: entry?.isCompleted ? null : stage,
        completed: entry?.isCompleted ?? false,
        completedAt: entry?.completedAt ?? null,
        attemptsLeft: entry
          ? entry.attemptsLeft(event.attemptLimit, now)
          : (event.attemptLimit?.count ?? null),
        attemptsTotal: entry?.attemptsTotal ?? 0,
        lockedCharacterIds: entry?.lockedCharacterIds ?? null,
        participated: entry?.participated ?? false,
        captureChance:
          beast && beast.grade !== 'SACRED'
            ? huntCaptureChance(
                beast.grade as keyof typeof HUNT_CAPTURE_CHANCE,
                entry?.captureFailures ?? 0
              )
            : null,
      },
    }
  }
}
