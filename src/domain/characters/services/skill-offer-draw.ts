import { Rng } from '@/core/rng/rng'
import { Skill } from '@/domain/skills/entities/skill'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { Character } from '../entities/character'
import { CharacterTemplate } from '../entities/character-template'
import { skillEligibilityError } from './skill-eligibility'

/** Um bloco a cada 5 níveis (D77). */
export const SKILL_OFFER_EVERY_LEVELS = 5

/** Até 3 skills por bloco (D77); menos quando o pool não dá (D135). */
export const SKILL_OFFER_SIZE = 3

/** Favorecimento leve às recém-liberadas: +0,30 de peso, caindo até 0 em 10 níveis (`progression_brief.md` 1.3). */
export const NEW_SKILL_WEIGHT_BONUS = 0.3
export const NEW_SKILL_WINDOW_LEVELS = 10

/** Nos níveis 50 e 100 o bloco garante ao menos uma Forte ou Final, se houver (`skills_brief.md` 12.6). */
export const SKILL_OFFER_MILESTONES: readonly number[] = [50, 100]
const MILESTONE_TIERS: readonly SkillTier[] = [
  SkillTier.STRONG,
  SkillTier.FINAL,
]

/** Níveis de bloco atravessados ao subir de `from` para `to` (ex.: 18 → 26 dá 20 e 25). */
export function skillOfferLevels(from: number, to: number): number[] {
  const levels: number[] = []
  const first =
    Math.floor(from / SKILL_OFFER_EVERY_LEVELS) * SKILL_OFFER_EVERY_LEVELS +
    SKILL_OFFER_EVERY_LEVELS

  for (let level = first; level <= to; level += SKILL_OFFER_EVERY_LEVELS) {
    levels.push(level)
  }

  return levels
}

/** Peso no sorteio: `1 + 0,30 × max(0, 1 − (nível do bloco − nível mínimo) / 10)`. */
export function skillOfferWeight(blockLevel: number, minLevel: number): number {
  return (
    1 +
    NEW_SKILL_WEIGHT_BONUS *
      Math.max(0, 1 - (blockLevel - minLevel) / NEW_SKILL_WINDOW_LEVELS)
  )
}

export interface SkillOfferDrawInput {
  character: Character
  template: CharacterTemplate
  /** O catálogo inteiro de skills (o pool sai das próprias variantes, D41). */
  skills: Iterable<Skill>
  blockLevel: number
  /** Skills que já estão em outro bloco pendente (não aparecem em dois ao mesmo tempo). */
  excludedSkillIds: ReadonlySet<string>
  rng: Rng
}

/** Sorteia um item pelo peso e o tira da lista. */
function takeWeighted(pool: Skill[], blockLevel: number, rng: Rng): Skill {
  const weights = pool.map((s) => skillOfferWeight(blockLevel, s.minLevel))
  let roll = rng.next() * weights.reduce((sum, w) => sum + w, 0)
  let index = 0
  while (index < pool.length - 1 && roll >= weights[index]) {
    roll -= weights[index]
    index += 1
  }

  return pool.splice(index, 1)[0]
}

/**
 * Sorteia o bloco do nível (D77, D135): skills do pool (fora do kit) que o personagem pode ter no nível do bloco
 * (próprias variantes, nível mínimo, despertada só se despertou), que ele ainda não tem e que não estão em outro bloco
 * pendente; até 3, sem repetir, pelo peso. Nos marcos 50 e 100, uma Forte ou Final vem garantida se existir.
 * Lista vazia = nenhuma elegível (o bloco não é criado).
 */
export function drawSkillOffer(input: SkillOfferDrawInput): Skill[] {
  const { character, template, blockLevel, excludedSkillIds, rng } = input
  const learned = new Set(character.skills.map((s) => s.skill.id.toValue()))

  const pool = [...input.skills]
    .filter(
      (skill) =>
        !skill.isKit &&
        !learned.has(skill.id.toValue()) &&
        !excludedSkillIds.has(skill.id.toValue()) &&
        skillEligibilityError(skill, {
          template,
          level: blockLevel,
          awakenedVariantId: character.awakenedVariantId,
        }) === null
    )
    // ordem fixa antes do sorteio: mesma sorte, mesmo bloco
    .sort((a, b) => a.key.localeCompare(b.key))

  const drawn: Skill[] = []

  if (SKILL_OFFER_MILESTONES.includes(blockLevel)) {
    const strong = pool.filter((s) => MILESTONE_TIERS.includes(s.tier))
    if (strong.length > 0) {
      const pick = takeWeighted(strong, blockLevel, rng)
      pool.splice(pool.indexOf(pick), 1)
      drawn.push(pick)
    }
  }

  while (drawn.length < SKILL_OFFER_SIZE && pool.length > 0) {
    drawn.push(takeWeighted(pool, blockLevel, rng))
  }

  return drawn
}
