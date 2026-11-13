import { Entity } from '@/core/entities/entity'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { BattleEventLink } from '../value-objects/battle-event-link'

export interface BattleDraftProps {
  accountId: UniqueEntityId
  npcSquadId: UniqueEntityId
  /** Só no servidor, nunca vai ao cliente (D33). */
  seed: number
  /** Campo sorteado pela seed (D28); nulo = catálogo sem campos. */
  fieldKey: string | null
  createdAt: Date
  /** Pré-batalha de evento (D155): o evento e a etapa; ausente = PvE comum. */
  event?: BattleEventLink | null
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

  get event(): Readonly<BattleEventLink> | null {
    return this.props.event ?? null
  }

  static create(props: BattleDraftProps, id?: UniqueEntityId) {
    return new BattleDraft(props, id)
  }
}
