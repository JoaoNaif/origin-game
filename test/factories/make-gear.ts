import { Account } from '@/domain/accounts/entities/account'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Gear } from '@/domain/gear/entities/gear'
import { GearTemplate } from '@/domain/gear/entities/gear-template'

/** O modelo de equipamento do seed pela `key`. */
export function gearTemplateOf(
  catalog: GameCatalog,
  key: string
): GearTemplate {
  const template = [...catalog.gearTemplates.values()].find(
    (g) => g.key === key
  )
  if (!template) throw new Error(`equipamento ${key} não existe no seed`)
  return template
}

/** Um equipamento da conta (guardado no inventário). */
export function makeGear(
  account: Account,
  template: GearTemplate,
  acquiredAt = new Date('2026-11-01T00:00:00Z')
): Gear {
  return Gear.create({
    accountId: account.id,
    templateId: template.id,
    source: 'ADMIN',
    acquiredAt,
  })
}
