import { Beast } from '../../entities/beast'

/** Porta das bestas das contas (ocupam espaço no inventário, D100). */
export abstract class BeastsRepository {
  abstract findById(id: string): Promise<Beast | null>
  /** As bestas da conta, da mais antiga para a mais nova. */
  abstract findManyByAccountId(accountId: string): Promise<Beast[]>
  abstract countByAccountId(accountId: string): Promise<number>
  /** As bestas com contrato com estes personagens. */
  abstract findManyByCharacterIds(characterIds: string[]): Promise<Beast[]>
  abstract create(beast: Beast): Promise<void>
  abstract save(beast: Beast): Promise<void>
  /** Tira da conta (contrato desfeito ou venda). `false` = já não existia. */
  abstract delete(beast: Beast): Promise<boolean>
}
