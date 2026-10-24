import { AiDifficulty } from '@/domain/ai/enums/ai-difficulty'
import { AiProfile } from '@/domain/ai/enums/ai-profile'
import { Battle } from '../../entities/battle'
import {
  BattleEndReason,
  BattleMode,
  BattleSide,
  BattleStatus,
} from '../../enums/battle-enums'

/** A batalha na lista da conta: sem a foto e sem o log (retomar ou ver o histórico). */
export interface BattleSummary {
  id: string
  mode: BattleMode
  status: BattleStatus
  squadId: string | null
  npcSquadId: string | null
  opponent: {
    name: string
    profile: AiProfile | null
    difficulty: AiDifficulty | null
  }
  winner: BattleSide | null
  endReason: BattleEndReason | null
  rounds: number | null
  startedAt: Date
  finishedAt: Date | null
}

export interface BattleListFilter {
  status?: BattleStatus
  limit: number
}

/** Porta de persistência das batalhas: seed, foto do início e log de ações (não o estado). */
export abstract class BattlesRepository {
  abstract findById(id: string): Promise<Battle | null>
  /** Batalhas da conta, da mais recente para a mais antiga. */
  abstract listByAccountId(
    accountId: string,
    filter: BattleListFilter
  ): Promise<BattleSummary[]>
  abstract create(battle: Battle): Promise<void>
  /**
   * Grava as ações novas (a partir de `knownActions`, quantas havia quando a batalha foi lida) e o fim. Devolve
   * `false` se outra requisição já gravou depois dessa leitura (jogada enviada duas vezes): nada é gravado.
   */
  abstract save(battle: Battle, knownActions: number): Promise<boolean>
}
