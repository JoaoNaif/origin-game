import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Character } from '@/domain/characters/entities/character'
import { domStatPercents } from '@/domain/characters/services/dom-rules'
import { computeStats } from '@/domain/characters/services/stat-calculator'
import { Gear } from '@/domain/gear/entities/gear'
import { GearTemplate } from '@/domain/gear/entities/gear-template'
import { gearSaleValue } from '@/domain/gear/gear-values'
import { characterGearBond } from '@/domain/gear/services/gear-bond'
import { gearEffects } from '@/domain/gear/services/gear-effects'

/** Equipamento vivo: o item da conta, o modelo e, com um portador, o elo e o efeito (D94, D153). */
export class GearPresenter {
  static toHTTP(gear: Gear, catalog: GameCatalog, holder?: Character | null) {
    const template = catalog.gearTemplates.get(gear.templateId.toValue())!

    return {
      id: gear.id.toString(),
      ...GearPresenter.template(template),
      source: gear.source,
      acquiredAt: gear.acquiredAt,
      characterId: gear.characterId?.toString() ?? null,
      /** Elo com quem está usando (nulo = guardado). */
      bond: holder ? GearPresenter.bond(template, holder, catalog) : null,
    }
  }

  static template(template: GearTemplate) {
    return {
      key: template.key,
      name: template.name,
      description: template.description,
      kind: template.kind,
      grade: template.grade,
      lineage: template.lineage,
      primaryStat: template.primaryStat,
      secondaryStat: template.secondaryStat,
      primaryPercent: template.primaryPercent,
      secondaryPercent: template.secondaryPercent,
      requirements: template.requirements,
      titles: template.titles,
      /** Moeda na venda ao sistema; nulo = Divino (não se vende). */
      saleValue: gearSaleValue(template.grade),
    }
  }

  /**
   * Elo de um personagem com o equipamento: cada requisito cumprido ou não, o que o título ou o Prodígio substituiu e
   * o efeito que daria (bônus, queda, custo do pleno, passiva e chance de perder a ação).
   */
  static bond(
    template: GearTemplate,
    character: Character,
    catalog: GameCatalog
  ) {
    const characterTemplate = catalog.templates.get(
      character.templateId.toValue()
    )!
    const result = characterGearBond(template, character, characterTemplate)

    return {
      characterId: character.id.toString(),
      bond: result.bond,
      requirements: result.requirements,
      met: result.met,
      waived: result.waived,
      matchingTitles: result.matchingTitles,
      effects: gearEffects(
        template,
        result.bond,
        characterTemplate.variants.length > 0
      ),
    }
  }

  /** Stats fora da batalha do personagem com o bônus do equipamento (o que a ficha mostra com ele equipado). */
  static statsWith(
    template: GearTemplate,
    character: Character,
    catalog: GameCatalog
  ) {
    const characterTemplate = catalog.templates.get(
      character.templateId.toValue()
    )!
    const { bond } = characterGearBond(template, character, characterTemplate)
    const { bonusPercents } = gearEffects(
      template,
      bond,
      characterTemplate.variants.length > 0
    )

    return computeStats({
      profile: characterTemplate.stats,
      level: character.level,
      freePoints: character.freePoints,
      traitEffects: character.traits.flatMap((t) => [...t.effects]),
      domPercents: domStatPercents(character.domPillars),
      gearPercents: bonusPercents,
    })
  }
}
