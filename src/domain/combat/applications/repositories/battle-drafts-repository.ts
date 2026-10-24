import { BattleDraft } from '../../entities/battle-draft'

/** Pré-batalhas em aberto (curtas: viram batalha quando o jogador escolhe o squad). */
export abstract class BattleDraftsRepository {
  abstract findById(id: string): Promise<BattleDraft | null>
  abstract create(draft: BattleDraft): Promise<void>
  /** Tira a pré-batalha. `false` se ela já não estava (outra requisição já a usou): só uma batalha nasce dela. */
  abstract delete(draft: BattleDraft): Promise<boolean>
}
