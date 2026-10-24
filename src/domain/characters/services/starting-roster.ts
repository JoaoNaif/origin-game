import { Either, left, right } from '@/core/either'
import { Account } from '@/domain/accounts/entities/account'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { templateKit } from '@/domain/catalog/services/template-skills'
import { Character } from '../entities/character'
import { InvalidCharacterError } from '../errors/invalid-character-error'

/**
 * Personagens com que toda conta começa (D133): no MVP, um de cada modelo do catálogo, no nível 0, com o kit básico
 * na build e o traço de família copiado. Os sistemas de ganho (baú, mercado) entram depois.
 */
export function startingRoster(
  account: Account,
  catalog: GameCatalog
): Either<InvalidCharacterError, Character[]> {
  const characters: Character[] = []
  const templates = [...catalog.templates.values()].sort((a, b) =>
    a.key.localeCompare(b.key)
  )

  for (const template of templates) {
    const created = Character.create({
      account,
      template,
      familyTrait: template.familyTraitId
        ? catalog.traits.get(template.familyTraitId.toValue())
        : null,
      kitSkills: templateKit(catalog, template),
    })
    if (created.isLeft()) return left(created.value)

    characters.push(created.value)
  }

  return right(characters)
}
