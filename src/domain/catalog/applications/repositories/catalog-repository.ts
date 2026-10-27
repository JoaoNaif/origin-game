import { Either } from '@/core/either'
import { ResourceInUseError } from '@/core/errors/err/resource-in-use-error'
import { CharacterTemplate } from '@/domain/characters/entities/character-template'
import { Trait } from '@/domain/characters/entities/trait'
import { Variant } from '@/domain/characters/entities/variant'
import { BattleField } from '@/domain/combat/entities/battle-field'
import { SnapshotCatalog } from '@/domain/combat/services/build-snapshot'
import { Skill } from '@/domain/skills/entities/skill'
import { NpcSquad } from '@/domain/squads/entities/npc-squad'
import { InvalidCatalogError } from '../../errors/invalid-catalog-error'

/**
 * Todo o conteúdo do admin, já validado pelo domínio. Os mapas são indexados pelo id, no formato que o
 * `buildPveSnapshot` usa.
 */
export interface GameCatalog extends SnapshotCatalog {
  fields: readonly BattleField[]
  npcSquads: readonly NpcSquad[]
  /** Identifica o conteúdo (gravado na batalha: o replay só é garantido com o mesmo conteúdo). */
  version: string
}

/** Um item do catálogo, pelo tipo (o que o admin cria, edita e apaga). */
export type CatalogEntry =
  | { kind: 'VARIANT'; entity: Variant }
  | { kind: 'TRAIT'; entity: Trait }
  | { kind: 'TEMPLATE'; entity: CharacterTemplate }
  | { kind: 'SKILL'; entity: Skill }
  | { kind: 'FIELD'; entity: BattleField }
  | { kind: 'NPC_SQUAD'; entity: NpcSquad }

export type CatalogKind = CatalogEntry['kind']

/**
 * Porta do catálogo. O conteúdo vem do seed e do admin. Quem grava garante que o catálogo **inteiro** continua válido
 * (cada item de novo pelo `create` do domínio, mais `catalogIntegrityError`): se a mudança quebra outro item, nada é
 * gravado.
 */
export abstract class CatalogRepository {
  abstract load(): Promise<GameCatalog>
  /** Cria ou troca o item (pelo id). */
  abstract save(entry: CatalogEntry): Promise<Either<InvalidCatalogError, void>>
  /** Apaga o item; `ResourceInUseError` se dado de jogador (personagem, skill aprendida) ainda usa. */
  abstract delete(
    kind: CatalogKind,
    id: string
  ): Promise<Either<InvalidCatalogError | ResourceInUseError, void>>
}
