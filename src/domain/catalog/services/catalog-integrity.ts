import { validateBasicKit } from '@/domain/characters/services/basic-kit'
import { GameCatalog } from '../applications/repositories/catalog-repository'
import { templateKit } from './template-skills'

/**
 * Regras do catálogo inteiro, além das de cada item (que o `create` de cada entidade já confere). Todo modelo precisa
 * de um kit básico válido: sem ele, a conta nova não recebe os personagens (D133). Cada variante despertada vem de um
 * despertar só (D151). `null` = válido.
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

  return null
}
