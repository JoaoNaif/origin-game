import { BattleSide } from '@/domain/combat/enums/battle-enums'
import {
  buildNpcSide,
  SnapshotCatalog,
} from '@/domain/combat/services/build-snapshot'
import { BattleSnapshot } from '@/domain/combat/value-objects/battle-snapshot'
import { NpcSquad } from '@/domain/squads/entities/npc-squad'

/** Foto com a mesma squad de NPC dos dois lados (calibração "mesmo squad", `pvp_brief.md` 10.4). */
export function makeMirrorSnapshot(
  npcSquad: NpcSquad,
  catalog: SnapshotCatalog
): BattleSnapshot {
  const side = buildNpcSide({ npcSquad, catalog })
  if (side.isLeft()) throw side.value

  const opponent = side.value

  return {
    player: {
      ...opponent,
      side: BattleSide.PLAYER,
      units: opponent.units.map((u) => ({
        ...u,
        ref: u.ref.replace(BattleSide.OPPONENT, BattleSide.PLAYER),
      })),
    },
    opponent,
    field: { initial: null, catalog: [] },
  }
}
