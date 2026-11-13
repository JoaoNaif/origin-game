import { Either, left, right } from '@/core/either'
import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { REWARD_BOX_DAYS } from '../event-values'
import { InvalidPendingRewardError } from '../errors/invalid-pending-reward-error'
import { EventReward } from '../value-objects/event-reward'

const DAY_MS = 24 * 60 * 60 * 1000

export interface PendingRewardProps {
  accountId: UniqueEntityId
  /** O que ficou guardado (equipamento ou besta: o que ocupa espaço no inventário). */
  reward: EventReward
  /** De onde veio (o evento), para o front mostrar. */
  eventId: UniqueEntityId | null
  createdAt: Date
  /** Depois disso some (`events_brief.md` 4.4); o front mostra a data limite. */
  expiresAt: Date
}

/**
 * Recompensa na caixa da conta (D155, `events_brief.md` 4.4): o prêmio que não coube no inventário. O jogador abre
 * espaço e retira, ou descarta. Some em 14 dias.
 */
export class PendingReward extends Entity<PendingRewardProps> {
  get accountId() {
    return this.props.accountId
  }

  get reward(): Readonly<EventReward> {
    return this.props.reward
  }

  get eventId() {
    return this.props.eventId
  }

  get createdAt() {
    return this.props.createdAt
  }

  get expiresAt() {
    return this.props.expiresAt
  }

  isExpiredAt(now: Date): boolean {
    return now.getTime() >= this.props.expiresAt.getTime()
  }

  static create(
    input: Omit<PendingRewardProps, 'expiresAt'>,
    id?: UniqueEntityId
  ): PendingReward {
    return new PendingReward(
      {
        ...input,
        reward: { ...input.reward },
        expiresAt: new Date(
          input.createdAt.getTime() + REWARD_BOX_DAYS * DAY_MS
        ),
      },
      id
    )
  }

  static restore(props: PendingRewardProps, id: UniqueEntityId) {
    return new PendingReward(props, id)
  }

  /** Erro se não pode retirar agora (vencida). */
  checkClaimable(now: Date): Either<InvalidPendingRewardError, void> {
    return this.isExpiredAt(now)
      ? left(new InvalidPendingRewardError('o prazo de retirada já passou'))
      : right(undefined)
  }
}
