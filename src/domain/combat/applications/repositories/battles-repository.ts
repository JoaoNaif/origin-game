import { Battle } from '../../entities/battle'

/** Porta de persistência das batalhas: seed, foto do início e log de ações (não o estado). */
export abstract class BattlesRepository {
  abstract findById(id: string): Promise<Battle | null>
  /** Últimas batalhas encerradas da conta, da mais recente para a mais antiga. */
  abstract findRecentFinishedByAccountId(
    accountId: string,
    limit: number
  ): Promise<Battle[]>
  abstract create(battle: Battle): Promise<void>
  /** Grava as ações novas e o fim (se terminou). */
  abstract save(battle: Battle): Promise<void>
}
