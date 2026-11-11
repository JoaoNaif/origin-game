import { DomLevel } from '../enums/dom-level'
import { DomPillar } from '../enums/dom-pillar'
import { DomRole } from '../enums/dom-role'
import { Stat } from '../enums/stat'
import { DomPillars } from '../value-objects/dom-state'

/** Níveis do menor para o maior. */
export const DOM_LEVEL_ORDER: readonly DomLevel[] = [
  DomLevel.BASIC,
  DomLevel.INTERMEDIATE,
  DomLevel.ADVANCED,
]

export const DOM_PILLAR_ORDER: readonly DomPillar[] = Object.values(DomPillar)

export const DOM_ROLE_ORDER: readonly DomRole[] = Object.values(DomRole)

/** Stats de cada pilar (D93, `dom_brief.md` 8.1). */
export const DOM_PILLAR_STATS: Record<
  DomPillar,
  { primary: Stat; secondary: Stat }
> = {
  MIND: { primary: Stat.PRECISION, secondary: Stat.EVASION },
  HEART: { primary: Stat.HP, secondary: Stat.DEFENSE },
  BODY: { primary: Stat.SPEED, secondary: Stat.ATTACK },
  AURA: { primary: Stat.WILL, secondary: Stat.ATTACK },
}

/** % dos stats por nível (D93): o intermediário substitui o básico; o avançado mantém o intermediário. */
export const DOM_STAT_PERCENTS: Record<
  DomLevel,
  { primary: number; secondary: number }
> = {
  BASIC: { primary: 3, secondary: 2 },
  INTERMEDIATE: { primary: 6, secondary: 4 },
  ADVANCED: { primary: 6, secondary: 4 },
}

/** Pontos na janela para cada nível (D93, `dom_brief.md` 8.2). */
export const DOM_THRESHOLDS: Record<DomLevel, number> = {
  BASIC: 8,
  INTERMEDIATE: 20,
  ADVANCED: 45,
}

/** Janela, perda e as regras do avançado (D93). */
export const DOM_RULES = {
  /** Janela móvel: as últimas batalhas até somar este peso. */
  window: 150,
  /** A perda é conferida a cada tanto de peso jogado. */
  checkEvery: 25,
  /** Perde um nível com menos que esta fração do limiar do nível atual. */
  lossShare: 0.7,
  /** Sem variante, a meta é menor (`dom_brief.md` 2). */
  noVariantFactor: 0.8,
  /** O avançado pede feitos de ao menos 3 papéis, com estes pontos em cada. */
  advancedRoles: 3,
  advancedRolePoints: 8,
} as const

/** Título do pilar avançado (D60, `dom_brief.md` 3.1): é também o nome da skill única. */
export const DOM_TITLES: Record<DomPillar, string> = {
  MIND: 'Vidente',
  HEART: 'Resiliente',
  BODY: 'Indestrutível',
  AURA: 'Rei',
}

/**
 * Títulos do personagem (D55, `progression_brief.md` 2.9). Por ora só os do DOM avançado; os de evento, ranqueado e
 * história entram com as suas camadas.
 */
export function characterTitles(pillars: DomPillars): string[] {
  return DOM_PILLAR_ORDER.filter((p) => pillars[p] === DomLevel.ADVANCED).map(
    (p) => DOM_TITLES[p]
  )
}

/** Todos os títulos que existem hoje (a lista de um equipamento só aceita estes). */
export const KNOWN_TITLES: readonly string[] = Object.values(DOM_TITLES)

/** Limiar do nível, menor para quem não tem variante (6 / 16 / 36). */
export function domThreshold(level: DomLevel, hasVariant: boolean): number {
  const points = DOM_THRESHOLDS[level]

  return hasVariant ? points : Math.floor(points * DOM_RULES.noVariantFactor)
}

export function nextDomLevel(level: DomLevel | undefined): DomLevel | null {
  if (!level) return DOM_LEVEL_ORDER[0]
  const index = DOM_LEVEL_ORDER.indexOf(level)

  return DOM_LEVEL_ORDER[index + 1] ?? null
}

export function previousDomLevel(level: DomLevel): DomLevel | null {
  return DOM_LEVEL_ORDER[DOM_LEVEL_ORDER.indexOf(level) - 1] ?? null
}

/**
 * % dos stats que o DOM dá (D93). Pilares diferentes no mesmo stat somam (Corpo e Aura dão Ataque). Entra depois dos
 * tetos (fora do teto de +15% dos traços, D152).
 */
export function domStatPercents(
  pillars: DomPillars
): Partial<Record<Stat, number>> {
  const result: Partial<Record<Stat, number>> = {}

  for (const pillar of DOM_PILLAR_ORDER) {
    const level = pillars[pillar]
    if (!level) continue
    const { primary, secondary } = DOM_PILLAR_STATS[pillar]
    const percents = DOM_STAT_PERCENTS[level]
    result[primary] = (result[primary] ?? 0) + percents.primary
    result[secondary] = (result[secondary] ?? 0) + percents.secondary
  }

  return result
}

/** Pilares avançados, na ordem dos pilares (cada um dá um título e uma skill única, D93 8.5). */
export function advancedDomPillars(pillars: DomPillars): DomPillar[] {
  return DOM_PILLAR_ORDER.filter((p) => pillars[p] === DomLevel.ADVANCED)
}
