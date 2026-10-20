import { Rng } from '@/core/rng/rng'
import { SnapshotField } from '../value-objects/battle-snapshot'

/** A unidade recebe o bônus se tiver qualquer um dos traços pedidos (D98). */
export function qualifies(field: SnapshotField, traitKeys: readonly string[]) {
  return field.requiredTraitKeys.some((key) => traitKeys.includes(key))
}

/** Quantos personagens do lado recebem o bônus do campo. */
export function qualifiedCount(
  field: SnapshotField,
  side: readonly (readonly string[])[]
): number {
  return side.filter((traitKeys) => qualifies(field, traitKeys)).length
}

/**
 * Sorteia o campo inicial pela seed, entre todos os campos do catálogo (D28, D112). O sorteio acontece **antes** de os
 * jogadores escolherem a squad: o campo é a primeira coisa mostrada, para cada um planejar em cima dele
 * (`pvp_brief.md` 3). Catálogo vazio = batalha sem campo.
 */
export function drawInitialField(
  fields: readonly SnapshotField[],
  rng: Rng
): SnapshotField | null {
  return fields.length > 0 ? rng.pick(fields) : null
}
