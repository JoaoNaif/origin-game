import { beastSaleValue } from '@/domain/beasts/beast-values'
import { Beast } from '@/domain/beasts/entities/beast'
import { BeastTemplate } from '@/domain/beasts/entities/beast-template'
import { masterRequirements } from '@/domain/beasts/services/beast-rules'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Character } from '@/domain/characters/entities/character'

/** Besta: o item da conta, o modelo e, no Mestre com dono, os requisitos com ele (D154). */
export class BeastPresenter {
  static toHTTP(beast: Beast, catalog: GameCatalog, holder?: Character | null) {
    const template = catalog.beastTemplates.get(beast.templateId.toValue())!

    return {
      id: beast.id.toString(),
      ...BeastPresenter.template(template),
      source: beast.source,
      acquiredAt: beast.acquiredAt,
      characterId: beast.characterId?.toString() ?? null,
      slot: beast.slot,
      /** Mestre com contrato: os requisitos com o dono agora (sem todos, a build fica bloqueada). */
      requirementsWithHolder:
        holder && template.contract === 'MASTER'
          ? BeastPresenter.requirements(template, holder, catalog)
          : null,
    }
  }

  static template(template: BeastTemplate) {
    return {
      key: template.key,
      name: template.name,
      description: template.description,
      contract: template.contract,
      grade: template.grade,
      lineage: template.lineage,
      skills: template.skills,
      requirements: template.requirements,
      titles: template.titles,
      /** Moeda na venda ao sistema (sem contrato); nulo = sagrada (não se vende). */
      saleValue: beastSaleValue(template.grade),
    }
  }

  /** Requisitos do contrato Mestre com um personagem: cada um cumprido ou não e o título que substituiu. */
  static requirements(
    template: BeastTemplate,
    character: Character,
    catalog: GameCatalog
  ) {
    const result = masterRequirements(
      template,
      character,
      catalog.templates.get(character.templateId.toValue())!
    )

    return {
      characterId: character.id.toString(),
      meets: result.bond === 'FULL',
      requirements: result.requirements,
      met: result.met,
      waived: result.waived,
      matchingTitles: result.matchingTitles,
    }
  }
}
