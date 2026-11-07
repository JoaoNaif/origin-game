import { Lineage } from '@/domain/characters/enums/lineage'

/**
 * Fragmentos de Éon por tipo (D104): um por linhagem, mais o Neutro (`NONE`, skills none). Numa variação (ganho,
 * gasto, conteúdo de baú) só aparecem os tipos que mudaram.
 */
export type Fragments = Partial<Record<Lineage, number>>

/** Os 7 tipos, na ordem do enum. */
export const FRAGMENT_TYPES: readonly Lineage[] = Object.values(Lineage)

/** Soma duas variações (sem zeros). */
export function addFragments(a: Fragments, b: Fragments): Fragments {
  const sum: Fragments = { ...a }
  for (const type of FRAGMENT_TYPES) {
    const value = (sum[type] ?? 0) + (b[type] ?? 0)
    if (value === 0) delete sum[type]
    else sum[type] = value
  }

  return sum
}

/** A variação com o sinal trocado (gasto). */
export function negateFragments(fragments: Fragments): Fragments {
  const negated: Fragments = {}
  for (const type of FRAGMENT_TYPES) {
    if (fragments[type]) negated[type] = -fragments[type]
  }

  return negated
}

export function totalFragments(fragments: Fragments): number {
  return FRAGMENT_TYPES.reduce((sum, type) => sum + (fragments[type] ?? 0), 0)
}
