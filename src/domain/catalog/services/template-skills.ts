import { CharacterTemplate } from '@/domain/characters/entities/character-template'
import { Skill } from '@/domain/skills/entities/skill'
import { SkillKitSlot } from '@/domain/skills/enums/skill-kit-slot'
import { GameCatalog } from '../applications/repositories/catalog-repository'

const KIT_ORDER: readonly SkillKitSlot[] = Object.values(SkillKitSlot)

/** Kit primeiro, na ordem dos papéis (Básica, Padrão, Função, Assinatura); depois o pool, por nível mínimo. */
function order(skill: Skill): number {
  return skill.kitSlot ? KIT_ORDER.indexOf(skill.kitSlot) : 100 + skill.minLevel
}

/**
 * Skills de um modelo: no conteúdo, a `key` de cada skill começa pela `key` do modelo (`kael-vaz:fire-strike`,
 * `data_model.md` 4).
 */
export function templateSkills(
  catalog: GameCatalog,
  template: CharacterTemplate
): Skill[] {
  const prefix = `${template.key}:`

  return [...catalog.skills.values()]
    .filter((s) => s.key.startsWith(prefix))
    .sort((a, b) => order(a) - order(b))
}

/** As 4 skills do kit básico do modelo (entram aprendidas e na build ao criar o personagem). */
export function templateKit(
  catalog: GameCatalog,
  template: CharacterTemplate
): Skill[] {
  return templateSkills(catalog, template).filter((s) => s.isKit)
}
