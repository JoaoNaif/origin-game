import {
  CatalogEntry,
  CatalogKind,
  GameCatalog,
} from '../applications/repositories/catalog-repository'

/** O item do catálogo pela `key` (a identidade estável do conteúdo, `data_model.md` 1). */
export function findCatalogEntry(
  catalog: GameCatalog,
  kind: CatalogKind,
  key: string
): CatalogEntry | null {
  const byKey = <T extends { key: string }>(items: Iterable<T>) =>
    [...items].find((item) => item.key === key)

  switch (kind) {
    case 'VARIANT': {
      const entity = byKey(catalog.variants.values())
      return entity ? { kind, entity } : null
    }
    case 'TRAIT': {
      const entity = byKey(catalog.traits.values())
      return entity ? { kind, entity } : null
    }
    case 'TEMPLATE': {
      const entity = byKey(catalog.templates.values())
      return entity ? { kind, entity } : null
    }
    case 'SKILL': {
      const entity = byKey(catalog.skills.values())
      return entity ? { kind, entity } : null
    }
    case 'FIELD': {
      const entity = byKey(catalog.fields)
      return entity ? { kind, entity } : null
    }
    case 'NPC_SQUAD': {
      const entity = byKey(catalog.npcSquads)
      return entity ? { kind, entity } : null
    }
  }
}

/**
 * Quem no catálogo usa o item (para apagar, ninguém pode usar). Dado de jogador (personagens, skills aprendidas)
 * fica de fora: quem confere é o repositório. As skills de um modelo são as de `key` com o prefixo dele.
 */
export function catalogUsages(
  catalog: GameCatalog,
  { kind, entity }: CatalogEntry
): string[] {
  const id = entity.id
  const usages: string[] = []
  const members = catalog.npcSquads.flatMap((squad) =>
    squad.members.map((member) => ({ squad, member }))
  )

  switch (kind) {
    case 'VARIANT':
      for (const v of catalog.variants.values())
        if (v.awakensFromId?.equals(id)) usages.push(`variante ${v.key}`)
      for (const t of catalog.traits.values())
        if (t.variantId?.equals(id)) usages.push(`traço ${t.key}`)
      for (const t of catalog.templates.values())
        if (t.variants.some((v) => v.variantId.equals(id)))
          usages.push(`modelo ${t.key}`)
      for (const s of catalog.skills.values())
        if (s.variantId?.equals(id)) usages.push(`skill ${s.key}`)
      for (const { squad, member } of members)
        if (member.awakenedVariantId?.equals(id))
          usages.push(`squad de NPC ${squad.key}`)
      break
    case 'TRAIT':
      for (const t of catalog.templates.values())
        if (t.familyTraitId?.equals(id)) usages.push(`modelo ${t.key}`)
      for (const f of catalog.fields)
        if (f.requiredTraitIds.some((t) => t.equals(id)))
          usages.push(`campo ${f.key}`)
      for (const { squad, member } of members)
        if (member.traitIds.some((t) => t.equals(id)))
          usages.push(`squad de NPC ${squad.key}`)
      break
    case 'TEMPLATE':
      for (const s of catalog.skills.values())
        if (s.key.startsWith(`${entity.key}:`)) usages.push(`skill ${s.key}`)
      for (const { squad, member } of members)
        if (member.templateId.equals(id))
          usages.push(`squad de NPC ${squad.key}`)
      break
    case 'SKILL':
      for (const { squad, member } of members)
        if (member.skillIds.some((s) => s.equals(id)))
          usages.push(`squad de NPC ${squad.key}`)
      break
    // a batalha guarda o campo e o rival como valor (foto): ninguém do catálogo aponta para eles
    case 'FIELD':
    case 'NPC_SQUAD':
      break
  }

  return [...new Set(usages)]
}
