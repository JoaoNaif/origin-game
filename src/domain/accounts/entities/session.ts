import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Optional } from '@/core/types/optional'

export interface SessionProps {
  accountId: UniqueEntityId
  /** Hash do refresh token (o token puro só existe na resposta do login). */
  tokenHash: string
  expiresAt: Date
  revokedAt: Date | null
  userAgent: string | null
  createdAt: Date
}

/** Validade do refresh token (sessão longa). */
export const SESSION_DURATION_DAYS = 30

const DAY_IN_MS = 24 * 60 * 60 * 1000

/**
 * Refresh token com rotação (modelo do help-invest): cada token serve uma vez; ao renovar, a sessão antiga é
 * revogada. As datas vêm de fora (o domínio não lê o relógio).
 */
export class Session extends Entity<SessionProps> {
  get accountId() {
    return this.props.accountId
  }

  get tokenHash() {
    return this.props.tokenHash
  }

  get expiresAt() {
    return this.props.expiresAt
  }

  get revokedAt() {
    return this.props.revokedAt
  }

  get userAgent() {
    return this.props.userAgent
  }

  get createdAt() {
    return this.props.createdAt
  }

  get isRevoked() {
    return this.props.revokedAt !== null
  }

  isExpired(now: Date) {
    return this.props.expiresAt.getTime() <= now.getTime()
  }

  revoke(now: Date) {
    if (this.isRevoked) return

    this.props.revokedAt = now
  }

  static expiresAtFrom(now: Date) {
    return new Date(now.getTime() + SESSION_DURATION_DAYS * DAY_IN_MS)
  }

  static create(
    props: Optional<SessionProps, 'revokedAt' | 'userAgent'>,
    id?: UniqueEntityId
  ) {
    return new Session(
      {
        ...props,
        revokedAt: props.revokedAt ?? null,
        userAgent: props.userAgent ?? null,
      },
      id
    )
  }
}
