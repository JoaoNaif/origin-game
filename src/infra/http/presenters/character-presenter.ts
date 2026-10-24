import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Character } from '@/domain/characters/entities/character'
import {
  availableFreePoints,
  maxFreePointsPerStat,
} from '@/domain/characters/services/free-points'
import {
  MAX_LEVEL,
  xpToNextLevel,
} from '@/domain/characters/services/level-curve'
import { computeStats } from '@/domain/characters/services/stat-calculator'

/** Personagem da conta com o que a tela precisa: stats calculados (fora de batalha), pontos e skills. */
export class CharacterPresenter {
  static toHTTP(character: Character, catalog: GameCatalog) {
    const template = catalog.templates.get(character.templateId.toValue())!

    return {
      id: character.id.toString(),
      templateKey: template.key,
      name: template.name,
      characterClass: template.characterClass,
      level: character.level,
      xp: character.xp,
      xpToNextLevel:
        character.level >= MAX_LEVEL ? null : xpToNextLevel(character.level),
      danger: character.danger,
      awakenedVariantKey: character.awakenedVariantId
        ? catalog.variants.get(character.awakenedVariantId.toValue())!.key
        : null,
      stats: computeStats({
        profile: template.stats,
        level: character.level,
        freePoints: character.freePoints,
        traitEffects: character.traits.flatMap((t) => [...t.effects]),
      }),
      freePoints: {
        allocated: character.freePoints,
        available: availableFreePoints(character.level),
        maxPerStat: maxFreePointsPerStat(
          template.characterClass,
          template.stats
        ),
      },
      traitKeys: character.traits.map((t) => t.key),
      skills: character.skills.map((s) => ({
        key: s.skill.key,
        name: s.skill.name,
        source: s.source,
        isEnhanced: s.isEnhanced,
        buildSlot: s.buildSlot,
      })),
    }
  }
}
