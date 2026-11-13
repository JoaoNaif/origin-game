import { Account } from '@/domain/accounts/entities/account'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Character } from '@/domain/characters/entities/character'
import { DraftPveBattleUseCase } from '@/domain/combat/applications/use-cases/draft-pve-battle'
import { StartPveBattleUseCase } from '@/domain/combat/applications/use-cases/start-pve-battle'
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
import { InMemorySkillOffersRepository } from 'test/repositories/in-memory-skill-offers-repository'
import { InMemoryWalletsRepository } from 'test/repositories/in-memory-wallets-repository'
import { InMemoryChestsRepository } from 'test/repositories/in-memory-chests-repository'
import { InMemoryGearRepository } from 'test/repositories/in-memory-gear-repository'
import { InMemoryBeastsRepository } from 'test/repositories/in-memory-beasts-repository'
import { InMemorySquadsRepository } from 'test/repositories/in-memory-squads-repository'
import { InMemoryEventEntriesRepository } from 'test/repositories/in-memory-event-entries-repository'
import { InMemoryPendingRewardsRepository } from 'test/repositories/in-memory-pending-rewards-repository'
import { EventBattles } from '@/domain/events/applications/services/event-battles'
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

  const battles = new InMemoryBattlesRepository()
  const skillOffers = new InMemorySkillOffersRepository()
  const wallets = new InMemoryWalletsRepository()
  const chests = new InMemoryChestsRepository()
  const gear = new InMemoryGearRepository()
  const beasts = new InMemoryBeastsRepository()
  const eventEntries = new InMemoryEventEntriesRepository()
  const pendingRewards = new InMemoryPendingRewardsRepository()

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
    battles,
    skillOffers,
    wallets,
    chests,
    gear,
    beasts,
    eventEntries,
    pendingRewards,
    eventBattles: new EventBattles(eventEntries, accounts, battles, {
      charactersRepository: characters,
      walletsRepository: wallets,
      chestsRepository: chests,
      gearRepository: gear,
      beastsRepository: beasts,
      pendingRewardsRepository: pendingRewards,
    }),
    seeds: new FakeSeedGenerator(),
    clock: new FakeClock(),
  }
}

export type PveWorld = Awaited<ReturnType<typeof makePveWorld>>

/** Pré-batalha + início contra o Iniciante equilibrado: devolve a batalha parada na vez do jogador. */
export async function startWorldBattle(world: PveWorld) {
  const accountId = world.account.id.toString()

  const drafted = await new DraftPveBattleUseCase(
    world.accounts,
    world.catalogRepository,
    world.drafts,
    world.seeds,
    world.clock
  ).execute({ accountId, npcSquadKey: 'balanced-beginner' })
  if (drafted.isLeft()) throw drafted.value

  const started = await new StartPveBattleUseCase(
    world.accounts,
    world.characters,
    world.squads,
    world.catalogRepository,
    world.drafts,
    world.battles,
    world.skillOffers,
    world.wallets,
    world.chests,
    world.gear,
    world.beasts,
    world.eventBattles,
    world.clock
  ).execute({
    accountId,
    draftId: drafted.value.draft.id.toString(),
    squadId: world.squad.id.toString(),
  })
  if (started.isLeft()) throw started.value

  return started.value
}
