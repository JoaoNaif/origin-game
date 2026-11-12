import { Character } from '@/domain/characters/entities/character'
import { CharacterTemplate } from '@/domain/characters/entities/character-template'
import { characterStats } from '@/domain/characters/services/awakening-draw'
import { characterTitles } from '@/domain/characters/services/dom-rules'
import { GearBondResult, gearBond } from '@/domain/gear/services/gear-bond'
import { BEASTS_PER_CHARACTER, SACRED_PER_CHARACTER } from '../beast-values'
import { BeastTemplate } from '../entities/beast-template'
import { BeastContract } from '../enums/beast-contract'

/** Quantas bestas o personagem pode ter: 1, mais o traço Domador (`EXTRA_BEAST_SLOT`, D64). */
export function beastsAllowed(character: Character): number {
  return (
    BEASTS_PER_CHARACTER +
    character.traits
      .flatMap((t) => [...t.effects])
      .reduce(
        (sum, e) => sum + (e.type === 'EXTRA_BEAST_SLOT' ? e.count : 0),
        0
      )
  )
}

/**
 * Requisitos do contrato Mestre (9.5): a régua do elo do equipamento, com título da lista valendo 1 (teto 1, 9.6). O
 * Prodígio não ajuda (é do equipamento). Só vale o pleno: sem ele, a build é bloqueada.
 */
export function masterRequirements(
  template: BeastTemplate,
  character: Character,
  characterTemplate: CharacterTemplate
): GearBondResult {
  return gearBond(template, {
    stats: characterStats(character, characterTemplate),
    titles: characterTitles(character.domPillars),
    traitWaivers: 0,
  })
}

/** A besta pode entrar em campo com este dono agora: no Mestre, todos os requisitos; os outros, sempre. */
export function meetsContract(
  template: BeastTemplate,
  character: Character,
  characterTemplate: CharacterTemplate
): boolean {
  return (
    template.contract !== BeastContract.MASTER ||
    masterRequirements(template, character, characterTemplate).bond === 'FULL'
  )
}

export interface ContractCheckInput {
  template: BeastTemplate
  character: Character
  characterTemplate: CharacterTemplate
  slot: number
  /** As bestas que o personagem já tem (fora a que está sendo firmada ou movida), com o slot e o modelo. */
  others: readonly { template: BeastTemplate; slot: number }[]
}

/**
 * Regras do contrato (D64, D95, D154): quantas bestas o personagem pode ter, uma sagrada só, um slot por invocação e,
 * no Mestre, os requisitos. `null` = pode.
 */
export function contractError(input: ContractCheckInput): string | null {
  const { template, character, characterTemplate, slot, others } = input

  const allowed = beastsAllowed(character)
  if (others.length + 1 > allowed) {
    return `o personagem pode ter ${allowed} besta${allowed > 1 ? 's' : ''} (mais só com o traço Domador)`
  }

  if (others.some((o) => o.slot === slot)) {
    return `o slot ${slot} já tem outra invocação`
  }

  if (
    template.isSacred &&
    others.filter((o) => o.template.isSacred).length >= SACRED_PER_CHARACTER
  ) {
    return 'uma besta sagrada por personagem'
  }

  if (!meetsContract(template, character, characterTemplate)) {
    return 'o contrato Mestre pede todos os requisitos de stats (sem parcial)'
  }

  return null
}
