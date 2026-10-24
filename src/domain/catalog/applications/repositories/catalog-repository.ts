import { BattleField } from '@/domain/combat/entities/battle-field'
import { SnapshotCatalog } from '@/domain/combat/services/build-snapshot'
import { NpcSquad } from '@/domain/squads/entities/npc-squad'

/**
 * Todo o conteúdo do admin (no MVP vem do `seed.ts`), já validado pelo domínio. Os mapas são indexados pelo id,
 * no formato que o `buildPveSnapshot` usa.
 */
export interface GameCatalog extends SnapshotCatalog {
  fields: readonly BattleField[]
  npcSquads: readonly NpcSquad[]
  /** Identifica o conteúdo (gravado na batalha: o replay só é garantido com o mesmo conteúdo). */
  version: string
}

/** Porta de leitura do catálogo (só leitura; o conteúdo muda pelo seed ou, depois, pelo admin). */
export abstract class CatalogRepository {
  abstract load(): Promise<GameCatalog>
}
