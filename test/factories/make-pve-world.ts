import { Account } from '@/domain/accounts/entities/account'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Character } from '@/domain/characters/entities/character'
import { Squad } from '@/domain/squads/entities/squad'
import { FakeClock } from 'test/gateways/fake-clock'
import { FakeSeedGenerator } from 'test/gateways/fake-seed-generator'
import { InMemoryAccountsRepository } from 'test/repositories/in-memory-accounts-repository'
import { InMemoryBattleDraftsRepository } from 'test/repositories/in-memory-battle-drafts-repository'
import { InMemoryBattlesRepository } from 'test/repositories/in-memory-battles-repository'
import {
  InMemoryCatalogRepository,
  seedCatalog,
} from 'test/repositories/in-memory-catalog-repository'
import { InMemoryCharactersRepository } from 'test/repositories/in-memory-characters-repository'
import { InMemorySquadsRepository } from 'test/repositories/in-memory-squads-repository'
import { makeAccount } from './make-account'
import { characterOf, makeRoster } from './make-roster'
import { makeSquad } from './make-squad'

/** Squad "CORE" do seed (equilibrado), na mesma formação do NPC. */
const SQUAD = [
  { key: 'gaia', row: 0, column: 0 },
  { key: 'kael-vaz', row: 2, column: 0 },
  { key: 'lucky', row: 0, column: 2 },
  { key: 'kara', row: 1, column: 2 },
]

let catalogCache: GameCatalog | null = null

/** Conta com os 12 personagens num nível, um squad salvo e todos os repositórios em memória (batalha PvE). */
export async function makePveWorld(level = 18) {
  catalogCache ??= seedCatalog()
  const catalog = catalogCache

  const account: Account = makeAccount({ username: 'jogador_pve' })
  const roster: Character[] = makeRoster(account, catalog, level)
  const squad: Squad = makeSquad({
    account,
    name: 'CORE',
    members: SQUAD.map(({ key, row, column }) => ({
      character: characterOf(roster, catalog, key),
      row,
      column,
    })),
  })

  const accounts = new InMemoryAccountsRepository()
  const characters = new InMemoryCharactersRepository()
  const squads = new InMemorySquadsRepository()
  await accounts.create(account)
  await characters.createMany(roster)
  await squads.create(squad)

  return {
    catalog,
    account,
    roster,
    squad,
    accounts,
    characters,
    squads,
    catalogRepository: new InMemoryCatalogRepository(catalog),
    drafts: new InMemoryBattleDraftsRepository(),
    battles: new InMemoryBattlesRepository(),
    seeds: new FakeSeedGenerator(),
    clock: new FakeClock(),
  }
}

export type PveWorld = Awaited<ReturnType<typeof makePveWorld>>
