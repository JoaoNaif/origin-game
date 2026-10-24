import { Prisma } from '@prisma/client'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Battle } from '@/domain/combat/entities/battle'
import { BattleActionPayload } from '@/domain/combat/value-objects/battle-action'
import { BattleSnapshot } from '@/domain/combat/value-objects/battle-snapshot'

export const battleInclude = {
  actions: { orderBy: { sequence: 'asc' } },
} satisfies Prisma.BattleInclude

export type PrismaBattle = Prisma.BattleGetPayload<{
  include: typeof battleInclude
}>

/** Foto e payloads são JSON gravados pelo próprio domínio (validados quando a batalha começou ou a ação entrou). */
const json = (value: unknown) => value as Prisma.InputJsonValue

export class PrismaBattleMapper {
  static toDomain(raw: PrismaBattle): Battle {
    return Battle.restore(
      {
        accountId: new UniqueEntityId(raw.accountId),
        mode: raw.mode,
        status: raw.status,
        squadId: raw.squadId ? new UniqueEntityId(raw.squadId) : null,
        npcSquadId: raw.npcSquadId ? new UniqueEntityId(raw.npcSquadId) : null,
        aiProfile: raw.aiProfile,
        aiDifficulty: raw.aiDifficulty,
        seed: raw.seed,
        engineVersion: raw.engineVersion,
        contentVersion: raw.contentVersion,
        snapshot: raw.snapshot as unknown as BattleSnapshot,
        actions: raw.actions.map((a) => ({
          sequence: a.sequence,
          round: a.round,
          side: a.side,
          actorRef: a.actorRef,
          payload: a.payload as unknown as BattleActionPayload,
        })),
        winner: raw.winner,
        endReason: raw.endReason,
        rounds: raw.rounds,
        startedAt: raw.startedAt,
        finishedAt: raw.finishedAt,
      },
      new UniqueEntityId(raw.id)
    )
  }

  /** A linha da batalha (as ações vão em `toPrismaActions`). */
  static toPrisma(battle: Battle): Prisma.BattleUncheckedCreateInput {
    return {
      id: battle.id.toString(),
      accountId: battle.accountId.toString(),
      mode: battle.mode,
      status: battle.status,
      squadId: battle.squadId?.toString() ?? null,
      npcSquadId: battle.npcSquadId?.toString() ?? null,
      aiProfile: battle.aiProfile,
      aiDifficulty: battle.aiDifficulty,
      seed: battle.seed,
      engineVersion: battle.engineVersion,
      contentVersion: battle.contentVersion,
      snapshot: json(battle.snapshot),
      winner: battle.winner,
      endReason: battle.endReason,
      rounds: battle.rounds,
      startedAt: battle.startedAt,
      finishedAt: battle.finishedAt,
    }
  }

  static toPrismaActions(battle: Battle): Prisma.BattleActionCreateManyInput[] {
    return battle.actions.map((a) => ({
      battleId: battle.id.toString(),
      sequence: a.sequence,
      round: a.round,
      side: a.side,
      actorRef: a.actorRef,
      type: a.payload.type,
      payload: json(a.payload),
    }))
  }
}
