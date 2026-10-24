import { Rng } from '@/core/rng/rng'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Character } from '../../entities/character'
import { SkillOffer } from '../../entities/skill-offer'
import {
  drawSkillOffer,
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
