import { Gear } from '../../entities/gear'

/** Porta do equipamento vivo das contas (o inventário, D100). */
export abstract class GearRepository {
  abstract findById(id: string): Promise<Gear | null>
  /** O inventário da conta, do mais antigo para o mais novo. */
  abstract findManyByAccountId(accountId: string): Promise<Gear[]>
  /** Quantos espaços do inventário estão ocupados. */
  abstract countByAccountId(accountId: string): Promise<number>
  /** O que está no slot de cada um destes personagens (no máximo 1 por personagem). */
  abstract findEquippedByCharacterIds(characterIds: string[]): Promise<Gear[]>
  abstract create(gear: Gear): Promise<void>
  /** Grava as mudanças de slot juntas (quem sai do slot antes de quem entra). */
  abstract saveMany(gear: Gear[]): Promise<void>
  /** Tira da conta (venda). `false` = já não existia (vendido duas vezes ao mesmo tempo). */
  abstract delete(gear: Gear): Promise<boolean>
}
