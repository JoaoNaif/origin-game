import { DomLevel } from '../enums/dom-level'
import { DomPillar } from '../enums/dom-pillar'
import { DomRole } from '../enums/dom-role'
import {
  DomBattleEntry,
  DomChange,
  DomFeat,
  DomState,
} from '../value-objects/dom-state'
import {
  DOM_PILLAR_ORDER,
  DOM_ROLE_ORDER,
  DOM_RULES,
  domThreshold,
  nextDomLevel,
  previousDomLevel,
} from './dom-rules'

/** Pesos com 3 casas (a janela soma pesos como 0,15 sem acumular erro de ponto flutuante). */
const roundWeight = (value: number) => Math.round(value * 1000) / 1000

/** Pontos do pilar na janela: o peso de cada batalha em que ele teve feito. */
export function domPillarPoints(
  history: readonly DomBattleEntry[],
  pillar: DomPillar
): number {
  return roundWeight(
    history.reduce(
      (sum, entry) =>
        entry.feats.some((f) => f.pillar === pillar) ? sum + entry.weight : sum,
      0
    )
  )
}

/** Pontos do pilar por papel na janela (o avançado pede 3 papéis com 8 cada). */
export function domRolePoints(
  history: readonly DomBattleEntry[],
  pillar: DomPillar
): Record<DomRole, number> {
  const points = Object.fromEntries(
    DOM_ROLE_ORDER.map((role) => [role, 0])
  ) as Record<DomRole, number>

  for (const entry of history) {
    for (const feat of entry.feats) {
      if (feat.pillar === pillar) points[feat.role] += entry.weight
    }
  }

  for (const role of DOM_ROLE_ORDER) points[role] = roundWeight(points[role])

  return points
}

/** Pode subir para `level`: os pontos do limiar e, no avançado, 3 papéis com 8 pontos (D93). */
export function meetsDomLevel(
  history: readonly DomBattleEntry[],
  pillar: DomPillar,
  level: DomLevel,
  hasVariant: boolean
): boolean {
  if (domPillarPoints(history, pillar) < domThreshold(level, hasVariant)) {
    return false
  }
  if (level !== DomLevel.ADVANCED) return true

  const roles = domRolePoints(history, pillar)

  return (
    DOM_ROLE_ORDER.filter((r) => roles[r] >= DOM_RULES.advancedRolePoints)
      .length >= DOM_RULES.advancedRoles
  )
}

/**
 * Um feito por pilar por batalha (`dom_brief.md` 4): com mais de um no mesmo pilar, vale o do papel com menos pontos
 * na janela (ajuda a chegar nos 3 papéis do avançado); empate, a ordem dos papéis.
 */
export function selectDomFeats(
  history: readonly DomBattleEntry[],
  feats: readonly DomFeat[]
): DomFeat[] {
  const selected: DomFeat[] = []

  for (const pillar of DOM_PILLAR_ORDER) {
    const roles = DOM_ROLE_ORDER.filter((role) =>
      feats.some((f) => f.pillar === pillar && f.role === role)
    )
    if (roles.length === 0) continue

    const points = domRolePoints(history, pillar)
    const role = roles.reduce((best, r) =>
      points[r] < points[best] ? r : best
    )
    selected.push({ pillar, role })
  }

  return selected
}

/** Põe a batalha na janela e tira as mais antigas até caber em `DOM_RULES.window` de peso. */
function pushToWindow(
  history: readonly DomBattleEntry[],
  entry: DomBattleEntry
): DomBattleEntry[] {
  const next = history.map((e) => ({ ...e, feats: [...e.feats] }))
  const last = next[next.length - 1]

  if (entry.feats.length === 0 && last && last.feats.length === 0) {
    last.weight = roundWeight(last.weight + entry.weight)
  } else {
    next.push({ weight: entry.weight, feats: [...entry.feats] })
  }

  let total = roundWeight(next.reduce((sum, e) => sum + e.weight, 0))
  while (total > DOM_RULES.window && next.length > 0) {
    const oldest = next[0]
    const excess = roundWeight(total - DOM_RULES.window)
    // batalhas sem feito encolhem; com feito, saem inteiras
    if (oldest.feats.length === 0 && oldest.weight > excess) {
      oldest.weight = roundWeight(oldest.weight - excess)
      total = DOM_RULES.window
    } else {
      next.shift()
      total = roundWeight(total - oldest.weight)
    }
  }

  return next
}

export interface DomBattleInput {
  /** Peso do modo (D93): 0 não conta (amistosa). */
  weight: number
  /** Todos os feitos cumpridos na batalha (pode ter mais de um por pilar). */
  feats: readonly DomFeat[]
  /** Sem variante, os limiares são ×0,8. */
  hasVariant: boolean
}

export interface DomBattleResult {
  state: DomState
  changes: DomChange[]
}

/**
 * Soma uma batalha no DOM (D61, D93): escolhe 1 feito por pilar, atualiza a janela, confere a perda a cada 25 de peso
 * (cai 1 nível abaixo de 70% do limiar do nível atual) e sobe no máximo 1 nível por pilar.
 */
export function recordDomBattle(
  state: DomState,
  input: DomBattleInput
): DomBattleResult {
  if (input.weight <= 0) return { state, changes: [] }

  const feats = selectDomFeats(state.history, input.feats)
  const history = pushToWindow(state.history, {
    weight: roundWeight(input.weight),
    feats,
  })
  const pillars = { ...state.pillars }
  const changes: DomChange[] = []

  let weightSinceCheck = roundWeight(state.weightSinceCheck + input.weight)
  const checksLoss = weightSinceCheck >= DOM_RULES.checkEvery
  if (checksLoss) {
    weightSinceCheck = roundWeight(weightSinceCheck - DOM_RULES.checkEvery)
  }

  for (const pillar of DOM_PILLAR_ORDER) {
    const current = pillars[pillar]

    if (checksLoss && current) {
      const floor =
        domThreshold(current, input.hasVariant) * DOM_RULES.lossShare
      if (domPillarPoints(history, pillar) < floor) {
        const to = previousDomLevel(current)
        if (to) pillars[pillar] = to
        else delete pillars[pillar]
        changes.push({ pillar, from: current, to })
        continue
      }
    }

    const next = nextDomLevel(current)
    if (next && meetsDomLevel(history, pillar, next, input.hasVariant)) {
      pillars[pillar] = next
      changes.push({ pillar, from: current ?? null, to: next })
    }
  }

  return { state: { pillars, history, weightSinceCheck }, changes }
}
