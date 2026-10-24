import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'

export interface BattleDraftProps {
  accountId: UniqueEntityId
  npcSquadId: UniqueEntityId
  /** Só no servidor, nunca vai ao cliente (D33). */
  seed: number
  /** Campo sorteado pela seed (D28); nulo = catálogo sem campos. */
  fieldKey: string | null
  createdAt: Date
}

/**
 * Pré-batalha (`pvp_brief.md` 3): o adversário escolhido e o campo já sorteado, mostrado **antes** de o jogador
 * escolher o squad (D28). Vira `Battle` quando o jogador escolhe a formação.
 */
export class BattleDraft extends Entity<BattleDraftProps> {
  get accountId() {
    return this.props.accountId
  }

  get npcSquadId() {
    return this.props.npcSquadId
  }

  get seed() {
    return this.props.seed
  }

  get fieldKey() {
    return this.props.fieldKey
  }

  get createdAt() {
    return this.props.createdAt
  }

  static create(props: BattleDraftProps, id?: UniqueEntityId) {
    return new BattleDraft(props, id)
  }
}
