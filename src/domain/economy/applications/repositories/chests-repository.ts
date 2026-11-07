import { Chest } from '../../entities/chest'

/** Porta dos baús da conta. */
export abstract class ChestsRepository {
  abstract findById(id: string): Promise<Chest | null>
  /** Baús ainda fechados da conta, do mais antigo para o mais novo. */
  abstract listClosedByAccountId(accountId: string): Promise<Chest[]>
  abstract create(chest: Chest): Promise<void>
  /** Grava a abertura só se o baú ainda estava fechado (abrir duas vezes ao mesmo tempo). `false` = já aberto. */
  abstract saveOpened(chest: Chest): Promise<boolean>
}
