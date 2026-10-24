import { BattleDraft } from '../../entities/battle-draft'

/** Pré-batalhas em aberto (curtas: viram batalha quando o jogador escolhe o squad). */
export abstract class BattleDraftsRepository {
  abstract findById(id: string): Promise<BattleDraft | null>
  abstract create(draft: BattleDraft): Promise<void>
  abstract delete(draft: BattleDraft): Promise<void>
}
