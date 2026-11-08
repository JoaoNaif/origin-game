import { DomLevel } from '../enums/dom-level'
import { DomPillar } from '../enums/dom-pillar'
import { DomRole } from '../enums/dom-role'

/** Nível de cada pilar que o personagem tem (pilar ausente = sem DOM nele). */
export type DomPillars = Partial<Record<DomPillar, DomLevel>>

/** Um feito cumprido numa batalha (`dom_brief.md` 4, D152). */
export interface DomFeat {
  pillar: DomPillar
  role: DomRole
}

/**
 * Uma batalha na janela do DOM: o peso do modo e os feitos que valeram (no máximo 1 por pilar). Batalhas seguidas sem
 * feito ficam numa entrada só, com os pesos somados.
 */
export interface DomBattleEntry {
  weight: number
  feats: DomFeat[]
}

/** DOM do personagem (D60, D61, D93): os níveis, a janela móvel e o peso desde a última conferência da perda. */
export interface DomState {
  pillars: DomPillars
  /** Da mais antiga para a mais nova; soma no máximo `DOM_RULES.window` de peso. */
  history: DomBattleEntry[]
  weightSinceCheck: number
}

/** Pilar que subiu ou caiu na batalha (a recompensa mostra). */
export interface DomChange {
  pillar: DomPillar
  from: DomLevel | null
  to: DomLevel | null
}

export function emptyDomState(): DomState {
  return { pillars: {}, history: [], weightSinceCheck: 0 }
}
