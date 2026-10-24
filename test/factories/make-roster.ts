import { Account } from '@/domain/accounts/entities/account'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Character } from '@/domain/characters/entities/character'
import { startingRoster } from '@/domain/characters/services/starting-roster'
import { xpToNextLevel } from '@/domain/characters/services/level-curve'

/** Os 12 personagens iniciais da conta (D133), opcionalmente já num nível. */
export function makeRoster(
  account: Account,
  catalog: GameCatalog,
  level = 0
): Character[] {
  const roster = startingRoster(account, catalog)
  if (roster.isLeft()) throw roster.value

  for (const character of roster.value) {
    while (character.level < level) {
      character.gainXp(xpToNextLevel(character.level))
    }
  }

  return roster.value
}

/** O personagem do modelo pela `key` (ex.: `kael-vaz`). */
export function characterOf(
  roster: Character[],
  catalog: GameCatalog,
  templateKey: string
): Character {
  const template = [...catalog.templates.values()].find(
    (t) => t.key === templateKey
  )!

  return roster.find((c) => c.templateId.equals(template.id))!
}
