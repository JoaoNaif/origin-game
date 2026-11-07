import { Rng } from '@/core/rng/rng'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Character } from '../../entities/character'
import { AWAKENED_MIN_LEVEL } from '@/domain/skills/enums/skill-tier'
import { SkillOffer } from '../../entities/skill-offer'
import { SkillOfferSource } from '../../enums/skill-offer-source'
import {
  drawSkillOffer,
  SKILL_OFFER_EVERY_LEVELS,
  skillOfferLevels,
} from '../../services/skill-offer-draw'

export interface SkillOffersOnLevelUpInput {
  character: Character
  /** O nível antes de ganhar o XP. */
  fromLevel: number
  catalog: GameCatalog
  /** Blocos ainda pendentes do personagem (as skills deles não se repetem nos novos). */
  pending: readonly SkillOffer[]
  rng: Rng
  now: Date
}

/**
 * Os blocos que o personagem ganhou ao subir de nível (D77, D135): um por múltiplo de 5 atravessado, em ordem. Nível
 * sem nenhuma skill elegível não gera bloco.
 */
export function skillOffersOnLevelUp(
  input: SkillOffersOnLevelUpInput
): SkillOffer[] {
  const { character, catalog, rng, now } = input
  const template = catalog.templates.get(character.templateId.toValue())
  if (!template) return []

  const excluded = new Set(
    input.pending.flatMap((o) => o.skillIds.map((id) => id.toValue()))
  )
  const offers: SkillOffer[] = []

  for (const level of skillOfferLevels(input.fromLevel, character.level)) {
    const skills = drawSkillOffer({
      character,
      template,
      skills: catalog.skills.values(),
      blockLevel: level,
      excludedSkillIds: excluded,
      rng,
    })
    if (skills.length === 0) continue

    for (const skill of skills) excluded.add(skill.id.toValue())

    const created = SkillOffer.create({
      characterId: character.id,
      level,
      skillIds: skills.map((s) => s.id),
      createdAt: now,
    })
    if (created.isRight()) offers.push(created.value)
  }

  return offers
}

export interface SkillOffersOnAwakeningInput {
  /** Já despertado. */
  character: Character
  catalog: GameCatalog
  pending: readonly SkillOffer[]
  rng: Rng
  now: Date
}

/**
 * Blocos de recuperação ao despertar (D151): um para cada nível de despertada já atingido (80, 85, ..., até o nível
 * atual), cada um com ao menos 1 skill despertada. Sem despertada sobrando para o nível, o bloco não abre.
 */
export function skillOffersOnAwakening(
  input: SkillOffersOnAwakeningInput
): SkillOffer[] {
  const { character, catalog, rng, now } = input
  const template = catalog.templates.get(character.templateId.toValue())
  if (!template || !character.isAwakened) return []

  const excluded = new Set(
    input.pending.flatMap((o) => o.skillIds.map((id) => id.toValue()))
  )
  const offers: SkillOffer[] = []

  for (
    let level = AWAKENED_MIN_LEVEL;
    level <= character.level;
    level += SKILL_OFFER_EVERY_LEVELS
  ) {
    const skills = drawSkillOffer({
      character,
      template,
      skills: catalog.skills.values(),
      blockLevel: level,
      excludedSkillIds: excluded,
      rng,
      requireAwakened: true,
    })
    if (skills.length === 0) continue

    for (const skill of skills) excluded.add(skill.id.toValue())

    const created = SkillOffer.create({
      characterId: character.id,
      level,
      source: SkillOfferSource.AWAKENING,
      skillIds: skills.map((s) => s.id),
      createdAt: now,
    })
    if (created.isRight()) offers.push(created.value)
  }

  return offers
}
