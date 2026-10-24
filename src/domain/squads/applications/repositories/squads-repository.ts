import { Squad } from '../../entities/squad'

/** Porta de persistência das formações salvas da conta. */
export abstract class SquadsRepository {
  abstract findById(id: string): Promise<Squad | null>
  abstract findManyByAccountId(accountId: string): Promise<Squad[]>
  abstract create(squad: Squad): Promise<void>
  abstract save(squad: Squad): Promise<void>
  abstract delete(squad: Squad): Promise<void>
}
