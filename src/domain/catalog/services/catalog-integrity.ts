import { BeastGrade } from '@/domain/beasts/enums/beast-grade'
import { validateBasicKit } from '@/domain/characters/services/basic-kit'
import { EventTemplate } from '@/domain/events/entities/event-template'
import { GameCatalog } from '../applications/repositories/catalog-repository'
import { templateKit } from './template-skills'

/**
 * Regras do catálogo inteiro, além das de cada item (que o `create` de cada entidade já confere). Todo modelo precisa
 * de um kit básico válido: sem ele, a conta nova não recebe os personagens (D133). Cada variante despertada vem de um
 * despertar só (D151). As `keys` dos eventos apontam para o que existe (D155). `null` = válido.
 */
export function catalogIntegrityError(catalog: GameCatalog): string | null {
  for (const template of catalog.templates.values()) {
    const error = validateBasicKit(template, templateKit(catalog, template))
    if (error) return `kit do modelo ${template.key}: ${error}`
  }

  const awakenedVariants = new Map<string, string>()
  for (const awakening of catalog.awakenings.values()) {
    const variantId = awakening.variantId.toValue()
    const other = awakenedVariants.get(variantId)
    if (other) {
      return `os despertares ${other} e ${awakening.key} dão a mesma variante`
    }
    awakenedVariants.set(variantId, awakening.key)
  }

  for (const event of catalog.events.values()) {
    const error = eventKeysError(catalog, event)
    if (error) return `evento ${event.key}: ${error}`
  }

  return null
}

/** As ligações do evento pela `key` (squads de NPC, campo, família, prêmios e a besta da caça). */
function eventKeysError(
  catalog: GameCatalog,
  event: EventTemplate
): string | null {
  const has = <T extends { key: string }>(items: Iterable<T>, key: string) =>
    [...items].some((item) => item.key === key)

  for (const [index, stage] of event.stages.entries()) {
    if (!has(catalog.npcSquads, stage.npcSquadKey)) {
      return `etapa ${index + 1}: squad de NPC ${stage.npcSquadKey} não existe`
    }
    if (stage.captureBeastKey) {
      const beast = [...catalog.beastTemplates.values()].find(
        (b) => b.key === stage.captureBeastKey
      )
      if (!beast) {
        return `etapa ${index + 1}: besta ${stage.captureBeastKey} não existe`
      }
      if (beast.grade === BeastGrade.SACRED) {
        return `etapa ${index + 1}: besta sagrada não sai de caça (só de chefe único)`
      }
    }
  }

  if (event.fieldKey && !has(catalog.fields, event.fieldKey)) {
    return `campo ${event.fieldKey} não existe`
  }

  for (const requirement of event.requirements) {
    if (
      requirement.type === 'FAMILY' &&
      !has(catalog.traits.values(), requirement.traitKey)
    ) {
      return `traço ${requirement.traitKey} não existe`
    }
  }

  for (const reward of event.allRewards) {
    if (
      reward.type === 'CHARACTER' &&
      !has(catalog.templates.values(), reward.templateKey)
    ) {
      return `modelo ${reward.templateKey} não existe`
    }
    if (
      reward.type === 'GEAR' &&
      !has(catalog.gearTemplates.values(), reward.gearKey)
    ) {
      return `equipamento ${reward.gearKey} não existe`
    }
    if (
      reward.type === 'BEAST' &&
      !has(catalog.beastTemplates.values(), reward.beastKey)
    ) {
      return `besta ${reward.beastKey} não existe`
    }
  }

  return null
}
