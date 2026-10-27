import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Session } from '../../entities/session'

export abstract class SessionsRepository {
  abstract findByTokenHash(tokenHash: string): Promise<Session | null>
  abstract create(session: Session): Promise<void>
  abstract save(session: Session): Promise<void>
  /** Revoga todas as sessões ainda não revogadas da conta. */
  abstract revokeAllByAccountId(
    accountId: UniqueEntityId,
    now: Date
  ): Promise<void>
  /**
   * Apaga todas as sessões da conta (troca de senha). Apagar, e não revogar: um token revogado que reaparece é
   * tratado como roubo e derrubaria também a sessão nova.
   */
  abstract deleteAllByAccountId(accountId: UniqueEntityId): Promise<void>
}
