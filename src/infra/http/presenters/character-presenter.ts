import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Character } from '@/domain/characters/entities/character'
import { CharacterTemplate } from '@/domain/characters/entities/character-template'
import { DomLevel } from '@/domain/characters/enums/dom-level'
import {
  domPillarPoints,
  domRolePoints,
} from '@/domain/characters/services/dom-progress'
import {
  DOM_PILLAR_ORDER,
  DOM_RULES,
  DOM_TITLES,
  domStatPercents,
  domThreshold,
  nextDomLevel,
} from '@/domain/characters/services/dom-rules'
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
      /** Dica do despertar (D67): SILENT, SIGNS, IMMINENT ou AWAKENED; nunca qual é nem as missões. */
      awakeningHint: character.awakeningHint,
      stats: computeStats({
        profile: template.stats,
        level: character.level,
        freePoints: character.freePoints,
        traitEffects: character.traits.flatMap((t) => [...t.effects]),
        domPercents: domStatPercents(character.domPillars),
      }),
      dom: CharacterPresenter.dom(character, template),
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

  /**
   * DOM (D60, D93, D152): por pilar, o nível, os pontos na janela (e por papel, para os 3 do avançado), o limiar do
   * próximo nível, o piso da perda e o título do avançado.
   */
  static dom(character: Character, template: CharacterTemplate) {
    const { pillars, history } = character.dom
    const hasVariant = template.variants.length > 0

    return {
      windowWeight:
        Math.round(history.reduce((sum, e) => sum + e.weight, 0) * 1000) / 1000,
      pillars: DOM_PILLAR_ORDER.map((pillar) => {
        const level = pillars[pillar] ?? null
        const next = nextDomLevel(level ?? undefined)

        return {
          pillar,
          level,
          points: domPillarPoints(history, pillar),
          roles: domRolePoints(history, pillar),
          nextLevel: next,
          nextThreshold: next ? domThreshold(next, hasVariant) : null,
          lossBelow: level
            ? domThreshold(level, hasVariant) * DOM_RULES.lossShare
            : null,
          title: level === DomLevel.ADVANCED ? DOM_TITLES[pillar] : null,
        }
      }),
    }
  }
}
