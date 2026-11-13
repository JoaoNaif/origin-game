import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { EventSquadMode } from '../enums/event-squad-mode'
import { InvalidEventError } from '../errors/invalid-event-error'
import { EventAttemptLimit } from './event-template'

export interface EventEntryProps {
  accountId: UniqueEntityId
  eventId: UniqueEntityId
  /** Quantas etapas já venceu (a próxima a jogar é esta, base 0). */
  clearedStages: number
  /** Caça: falhas de captura na etapa atual (+10 pontos cada, `events_brief.md` 5.1). */
  captureFailures: number
  /** Squad fixo: os personagens travados na primeira batalha (nulo = ainda não travou, ou squad livre). */
  lockedCharacterIds: string[] | null
  /** Dia (UTC, `AAAA-MM-DD`) das tentativas de `attemptsToday`. */
  attemptsDay: string | null
  attemptsToday: number
  attemptsTotal: number
  /** Já recebeu o prêmio de participação. */
  participated: boolean
  completedAt: Date | null
  createdAt: Date
}

/** Dia UTC de uma data (`AAAA-MM-DD`): o limite por dia vira à meia-noite UTC. */
export function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Participação da conta num evento (D155, `events_brief.md` 3): as etapas vencidas, as tentativas, o squad travado e
 * o que já recebeu. Nasce na primeira batalha do evento.
 */
export class EventEntry extends Entity<EventEntryProps> {
  get accountId() {
    return this.props.accountId
  }

  get eventId() {
    return this.props.eventId
  }

  get clearedStages() {
    return this.props.clearedStages
  }

  get captureFailures() {
    return this.props.captureFailures
  }

  get lockedCharacterIds(): readonly string[] | null {
    return this.props.lockedCharacterIds
  }

  get attemptsDay() {
    return this.props.attemptsDay
  }

  get attemptsToday() {
    return this.props.attemptsToday
  }

  get attemptsTotal() {
    return this.props.attemptsTotal
  }

  get participated() {
    return this.props.participated
  }

  get completedAt() {
    return this.props.completedAt
  }

  get isCompleted() {
    return this.props.completedAt !== null
  }

  get createdAt() {
    return this.props.createdAt
  }

  static create(
    props: Pick<EventEntryProps, 'accountId' | 'eventId' | 'createdAt'>,
    id?: UniqueEntityId
  ): EventEntry {
    return new EventEntry(
      {
        ...props,
        clearedStages: 0,
        captureFailures: 0,
        lockedCharacterIds: null,
        attemptsDay: null,
        attemptsToday: 0,
        attemptsTotal: 0,
        participated: false,
        completedAt: null,
      },
      id
    )
  }

  static restore(props: EventEntryProps, id: UniqueEntityId): EventEntry {
    return new EventEntry(props, id)
  }

  /** Tentativas usadas no período do limite (hoje ou no evento). */
  attemptsUsed(limit: EventAttemptLimit | null, now: Date): number {
    if (!limit) return this.props.attemptsTotal
    if (limit.per === 'EVENT') return this.props.attemptsTotal
    return this.props.attemptsDay === utcDay(now) ? this.props.attemptsToday : 0
  }

  /** Quantas ainda pode usar; nulo = à vontade. */
  attemptsLeft(limit: EventAttemptLimit | null, now: Date): number | null {
    if (!limit) return null
    return Math.max(0, limit.count - this.attemptsUsed(limit, now))
  }

  /** Erro se não pode jogar a próxima etapa agora (evento concluído ou sem tentativas). */
  playError(limit: EventAttemptLimit | null, now: Date): string | null {
    if (this.isCompleted) return 'você já concluiu este evento'
    if (this.attemptsLeft(limit, now) === 0) {
      return limit?.per === 'DAY'
        ? 'sem tentativas hoje: volte amanhã'
        : 'sem tentativas neste evento'
    }

    return null
  }

  /**
   * Squad fixo: trava na primeira batalha e depois só aceita os mesmos personagens (em qualquer posição). Squad livre:
   * aceita qualquer um.
   */
  checkSquad(
    mode: EventSquadMode,
    characterIds: readonly string[]
  ): Either<InvalidEventError, void> {
    if (mode !== EventSquadMode.FIXED) return right(undefined)

    const locked = this.props.lockedCharacterIds
    if (!locked) return right(undefined)

    const same =
      locked.length === characterIds.length &&
      characterIds.every((id) => locked.includes(id))
    return same
      ? right(undefined)
      : left(
          new InvalidEventError(
            'o squad deste evento é fixo: use os mesmos personagens da primeira batalha'
          )
        )
  }

  /** Conta uma tentativa (a batalha começou) e trava o squad fixo na primeira. */
  recordAttempt(
    mode: EventSquadMode,
    characterIds: readonly string[],
    now: Date
  ) {
    const day = utcDay(now)
    if (this.props.attemptsDay !== day) {
      this.props.attemptsDay = day
      this.props.attemptsToday = 0
    }
    this.props.attemptsToday += 1
    this.props.attemptsTotal += 1

    if (mode === EventSquadMode.FIXED && !this.props.lockedCharacterIds) {
      this.props.lockedCharacterIds = [...characterIds]
    }
  }

  /** Venceu a etapa `stage`: avança e, se era a última, conclui. Devolve se concluiu agora. */
  clearStage(stage: number, totalStages: number, now: Date): boolean {
    if (this.isCompleted || stage !== this.props.clearedStages) return false

    this.props.clearedStages += 1
    this.props.captureFailures = 0
    if (this.props.clearedStages >= totalStages) {
      this.props.completedAt = now
      return true
    }

    return false
  }

  /** Caça: venceu mas a besta não aceitou; a próxima tentativa ganha +10 pontos. */
  recordCaptureFailure() {
    this.props.captureFailures += 1
  }

  /** Marca a participação; `true` só na primeira vez (o prêmio sai uma vez). */
  markParticipated(): boolean {
    if (this.props.participated) return false
    this.props.participated = true
    return true
  }
}
