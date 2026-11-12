import { Account } from '@/domain/accounts/entities/account'
import { Beast } from '@/domain/beasts/entities/beast'
import { BeastTemplate } from '@/domain/beasts/entities/beast-template'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'

/** A besta do seed pela `key`. */
export function beastTemplateOf(
  catalog: GameCatalog,
  key: string
): BeastTemplate {
  const template = [...catalog.beastTemplates.values()].find(
    (b) => b.key === key
  )
  if (!template) throw new Error(`besta ${key} não existe no seed`)
  return template
}

/** Uma besta da conta, ainda sem contrato. */
export function makeBeast(
  account: Account,
  template: BeastTemplate,
  acquiredAt = new Date('2026-11-01T00:00:00Z')
): Beast {
  return Beast.create({
    accountId: account.id,
    templateId: template.id,
    source: 'ADMIN',
    acquiredAt,
  })
}
