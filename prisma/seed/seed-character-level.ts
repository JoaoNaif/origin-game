import { skillOffersOnLevelUp } from '@/domain/characters/applications/services/skill-offers-on-level-up'
import { Character } from '@/domain/characters/entities/character'
import { SkillOffer } from '@/domain/characters/entities/skill-offer'
import { defaultFreePoints } from '@/domain/characters/services/free-points'
import { xpToNextLevel } from '@/domain/characters/services/level-curve'
import { SeededRng } from '@/core/rng/seeded-rng'
import { PrismaService } from '@/infra/database/prisma/prisma.service'
import { PrismaCatalogRepository } from '@/infra/database/prisma/repositories/prisma-catalog-repository'
import { PrismaCharactersRepository } from '@/infra/database/prisma/repositories/prisma-characters-repository'
import { PrismaSkillOffersRepository } from '@/infra/database/prisma/repositories/prisma-skill-offers-repository'

/** Nível das contas do seed: o meio da faixa do Iniciante (D103), para já jogar contra os NPCs mais fracos. */
export const SEED_CHARACTER_LEVEL = 18

export interface RaisedCharacters {
  raised: number
  offers: number
}

/**
 * Leva ao nível do seed os personagens que estão abaixo dele: XP pela curva, a distribuição padrão dos pontos livres
 * (a mesma dos NPCs, só se o jogador ainda não distribuiu nenhum) e os blocos de skill dos níveis atravessados (D77).
 * Quem já está no nível ou acima fica como está; a sorte dos blocos é fixa (`offersSeed`).
 */
export async function raiseToSeedLevel(
  prisma: PrismaService,
  characters: Character[],
  offersSeed: number
): Promise<RaisedCharacters> {
  const catalog = new PrismaCatalogRepository(prisma)
  const charactersRepository = new PrismaCharactersRepository(prisma, catalog)
  const offersRepository = new PrismaSkillOffersRepository(prisma)
  const below = characters.filter((c) => c.level < SEED_CHARACTER_LEVEL)
  if (below.length === 0) return { raised: 0, offers: 0 }

  const content = await catalog.load()
  const pending = await offersRepository.findPendingByCharacterIds(
    below.map((c) => c.id.toString())
  )
  const rng = new SeededRng(offersSeed)
  const offers: SkillOffer[] = []

  for (const character of below) {
    const fromLevel = character.level
    while (character.level < SEED_CHARACTER_LEVEL) {
      character.gainXp(xpToNextLevel(character.level))
    }

    const template = content.templates.get(character.templateId.toValue())!
    const allocated = Object.values(character.freePoints).some((v) => v > 0)
    if (!allocated) {
      const result = character.allocateFreePoints(
        defaultFreePoints(template.stats, character.level),
        template
      )
      if (result.isLeft()) throw result.value
    }

    await charactersRepository.save(character)

    offers.push(
      ...skillOffersOnLevelUp({
        character,
        fromLevel,
        catalog: content,
        pending: pending.filter((o) => o.characterId.equals(character.id)),
        rng,
        now: new Date(),
      })
    )
  }

  await offersRepository.createMany(offers)

  return { raised: below.length, offers: offers.length }
}
