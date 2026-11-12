import { Character } from '@/domain/characters/entities/character'
import { CharacterTemplate } from '@/domain/characters/entities/character-template'
import { Stat } from '@/domain/characters/enums/stat'
import {
  characterStats,
  RELATIVE_STAT_SPAN,
  relativeStatRanking,
} from '@/domain/characters/services/awakening-draw'
import { characterTitles } from '@/domain/characters/services/dom-rules'
import { StatBlock } from '@/domain/characters/value-objects/stat-block'
import { GearRequirement, GearTemplate } from '../entities/gear-template'
import { GearBond } from '../enums/gear-bond'
import { GEAR_MAX_WAIVERS } from '../gear-values'

/** O que o elo lê do modelo: os requisitos e os títulos que ajudam (equipamento e contrato Mestre, D95). */
export interface RequirementProfile {
  requirements: readonly GearRequirement[]
  titles: readonly string[]
}

export interface GearBondInput {
  /** Stats fora da batalha do portador, sem o equipamento (a régua do despertar, D151). */
  stats: StatBlock
  /** Títulos do portador (hoje, os do DOM avançado). */
  titles: readonly string[]
  /** Requisitos que os traços valem (Prodígio, `GEAR_REQUIREMENT_WAIVER`). */
  traitWaivers: number
}

export interface GearBondResult {
  bond: GearBond
  requirements: (GearRequirement & { met: boolean })[]
  /** Requisitos cumpridos de verdade. */
  met: number
  /** Títulos da lista do equipamento que o portador tem. */
  matchingTitles: string[]
  /** Requisitos substituídos (título ou Prodígio, teto 1). */
  waived: number
}

/**
 * Elo do portador com o equipamento (`living_gear_brief.md` 4.1, 9.1, 9.4): alto = entre os 2 maiores stats na régua
 * das classes, baixo = entre os 2 menores. Título da lista ou Prodígio valem 1 requisito (teto 1, D81). Todos cumpridos
 * = pleno; metade ou mais = parcial; menos = sem elo.
 */
export function gearBond(
  template: RequirementProfile,
  input: GearBondInput
): GearBondResult {
  const ranking = relativeStatRanking(input.stats)
  const high = new Set<Stat>(ranking.slice(0, RELATIVE_STAT_SPAN))
  const low = new Set<Stat>(ranking.slice(-RELATIVE_STAT_SPAN))

  const requirements = template.requirements.map((r) => ({
    ...r,
    met: r.level === 'HIGH' ? high.has(r.stat) : low.has(r.stat),
  }))
  const met = requirements.filter((r) => r.met).length
  const total = requirements.length

  const matchingTitles = template.titles.filter((t) => input.titles.includes(t))
  const waived = Math.min(
    GEAR_MAX_WAIVERS,
    matchingTitles.length + Math.max(0, input.traitWaivers),
    total - met
  )
  const effective = met + waived

  const bond =
    effective >= total
      ? GearBond.FULL
      : effective * 2 >= total
        ? GearBond.PARTIAL
        : GearBond.NONE

  return { bond, requirements, met, matchingTitles, waived }
}

/** Elo de um personagem da conta com o equipamento. */
export function characterGearBond(
  template: GearTemplate,
  character: Character,
  characterTemplate: CharacterTemplate
): GearBondResult {
  return gearBond(template, {
    stats: characterStats(character, characterTemplate),
    titles: characterTitles(character.domPillars),
    traitWaivers: character.traits
      .flatMap((t) => [...t.effects])
      .reduce(
        (sum, e) => sum + (e.type === 'GEAR_REQUIREMENT_WAIVER' ? e.count : 0),
        0
      ),
  })
}
