import { BattlesRepository } from '@/domain/combat/applications/repositories/battles-repository'
import { Battle } from '@/domain/combat/entities/battle'
import { BattleSnapshot } from '@/domain/combat/value-objects/battle-snapshot'

/** Cópia como sai do banco: duas leituras da mesma batalha não dividem o mesmo objeto (duas requisições). */
function copy(battle: Battle): Battle {
  return Battle.restore(
    {
      accountId: battle.accountId,
      mode: battle.mode,
      status: battle.status,
      squadId: battle.squadId,
      npcSquadId: battle.npcSquadId,
      aiProfile: battle.aiProfile,
      aiDifficulty: battle.aiDifficulty,
      seed: battle.seed,
      engineVersion: battle.engineVersion,
      contentVersion: battle.contentVersion,
      snapshot: battle.snapshot as BattleSnapshot,
      actions: [...battle.actions],
      winner: battle.winner,
      endReason: battle.endReason,
      rounds: battle.rounds,
      startedAt: battle.startedAt,
      finishedAt: battle.finishedAt,
    },
    battle.id
  )
}

export class InMemoryBattlesRepository implements BattlesRepository {
  public items: Battle[] = []

  async findById(id: string): Promise<Battle | null> {
    const battle = this.items.find((item) => item.id.toString() === id)

    return battle ? copy(battle) : null
  }

  async findRecentFinishedByAccountId(
    accountId: string,
    limit: number
  ): Promise<Battle[]> {
    return this.items
      .filter(
        (item) => item.accountId.toString() === accountId && item.isFinished
      )
      .sort((a, b) => b.finishedAt!.getTime() - a.finishedAt!.getTime())
      .slice(0, limit)
      .map(copy)
  }

  async create(battle: Battle): Promise<void> {
    this.items.push(copy(battle))
  }

  /** Como a chave do banco (batalha + sequência): quem leu um log que já cresceu não grava. */
  async save(battle: Battle, knownActions: number): Promise<boolean> {
    const index = this.items.findIndex((item) => item.id.equals(battle.id))
    if (this.items[index].actions.length !== knownActions) return false

    this.items[index] = copy(battle)

    return true
  }
}
