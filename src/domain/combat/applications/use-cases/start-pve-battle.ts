import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { SkillOffersRepository } from '@/domain/characters/applications/repositories/skill-offers-repository'
import { SquadsRepository } from '@/domain/squads/applications/repositories/squads-repository'
import { ChestsRepository } from '@/domain/economy/applications/repositories/chests-repository'
import { WalletsRepository } from '@/domain/economy/applications/repositories/wallets-repository'
import { BattleLoot } from '@/domain/economy/value-objects/battle-loot'
import { BeastsRepository } from '@/domain/beasts/applications/repositories/beasts-repository'
import { BeastTemplate } from '@/domain/beasts/entities/beast-template'
import { GearRepository } from '@/domain/gear/applications/repositories/gear-repository'
import { GearTemplate } from '@/domain/gear/entities/gear-template'
import { BattleEngine } from '../../engine/battle-engine'
import { BattleEvent } from '../../engine/battle-events'
import { Battle } from '../../entities/battle'
import { BuildSnapshotError } from '../../errors/build-snapshot-error'
import { InvalidActionError } from '../../errors/invalid-action-error'
import { InvalidBattleError } from '../../errors/invalid-battle-error'
import { buildPveSnapshot } from '../../services/build-snapshot'
import { Clock } from '@/core/gateways/clock'
import { BattleDraftsRepository } from '../repositories/battle-drafts-repository'
import { BattlesRepository } from '../repositories/battles-repository'
import {
  CharacterReward,
  deliverBattleRewards,
} from '../services/battle-rewards'
import {
  catalogFields,
  ENGINE_VERSION,
  finishIfOver,
  playMachineTurns,
  startEngine,
} from '../services/pve-session'

interface StartPveBattleUseCaseRequest {
  accountId: string
  draftId: string
  squadId: string
}

type StartPveBattleUseCaseResponse = Either<
  | ResourceNotFoundError
  | NotAllowedError
  | BuildSnapshotError
  | InvalidBattleError
  | InvalidActionError,
  {
    battle: Battle
    engine: BattleEngine
    events: readonly BattleEvent[]
    rewards: CharacterReward[]
    loot: BattleLoot | null
  }
>

/**
 * Começa a batalha da pré-batalha com o squad escolhido (D75): monta a foto dos dois lados (com o equipamento vivo de
 * cada um, D153), grava a batalha e joga as vezes da máquina até a vez do jogador. A seed e o campo vêm da pré-batalha (D28, D112).
 */
export class StartPveBattleUseCase {
  constructor(
    private accountsRepository: AccountsRepository,
    private charactersRepository: CharactersRepository,
    private squadsRepository: SquadsRepository,
    private catalogRepository: CatalogRepository,
    private battleDraftsRepository: BattleDraftsRepository,
    private battlesRepository: BattlesRepository,
    private skillOffersRepository: SkillOffersRepository,
    private walletsRepository: WalletsRepository,
    private chestsRepository: ChestsRepository,
    private gearRepository: GearRepository,
    private beastsRepository: BeastsRepository,
    private clock: Clock
  ) {}

  async execute({
    accountId,
    draftId,
    squadId,
  }: StartPveBattleUseCaseRequest): Promise<StartPveBattleUseCaseResponse> {
    const draft = await this.battleDraftsRepository.findById(draftId)
    if (!draft) return left(new ResourceNotFoundError('pré-batalha'))
    if (draft.accountId.toString() !== accountId) {
      return left(new NotAllowedError())
    }

    const [account, squad, catalog] = await Promise.all([
      this.accountsRepository.findById(draft.accountId.toString()),
      this.squadsRepository.findById(squadId),
      this.catalogRepository.load(),
    ])
    if (!account) return left(new ResourceNotFoundError('conta'))
    if (!squad) return left(new ResourceNotFoundError('squad'))
    if (!squad.accountId.equals(account.id)) return left(new NotAllowedError())

    const npcSquad = catalog.npcSquads.find((s) =>
      s.id.equals(draft.npcSquadId)
    )
    if (!npcSquad) return left(new ResourceNotFoundError('squad de NPC'))

    const fields = catalogFields(catalog)
    if (fields.isLeft()) return left(fields.value)

    const characterIds = squad.members.map((m) => m.characterId.toString())
    const [characters, equipped, contracted] = await Promise.all([
      this.charactersRepository.findManyByIds(characterIds),
      this.gearRepository.findEquippedByCharacterIds(characterIds),
      this.beastsRepository.findManyByCharacterIds(characterIds),
    ])
    // o equipamento no slot de cada um (D94): o elo é calculado agora e fica fixo na batalha
    const gear = new Map<string, GearTemplate>()
    for (const item of equipped) {
      const template = catalog.gearTemplates.get(item.templateId.toValue())
      if (template && item.characterId) {
        gear.set(item.characterId.toString(), template)
      }
    }

    // as bestas com contrato (D154): a invocação toma o slot dela na build
    const beasts = new Map<
      string,
      { template: BeastTemplate; slot: number }[]
    >()
    for (const beast of contracted) {
      const template = catalog.beastTemplates.get(beast.templateId.toValue())
      if (!template || !beast.characterId || beast.slot === null) continue
      const key = beast.characterId.toString()
      beasts.set(key, [
        ...(beasts.get(key) ?? []),
        { template, slot: beast.slot },
      ])
    }

    const snapshot = buildPveSnapshot(
      { account, squad, characters, catalog, gear, beasts },
      { npcSquad, catalog },
      {
        initial: fields.value.find((f) => f.key === draft.fieldKey) ?? null,
        catalog: fields.value,
      }
    )
    if (snapshot.isLeft()) return left(snapshot.value)

    const started = Battle.startPve({
      account,
      squadId: squad.id,
      npcSquad,
      seed: draft.seed,
      engineVersion: ENGINE_VERSION,
      contentVersion: catalog.version,
      snapshot: snapshot.value,
      startedAt: this.clock.now(),
    })
    if (started.isLeft()) return left(started.value)

    const battle = started.value
    const engine = startEngine(battle)

    const played = playMachineTurns(battle, engine)
    if (played.isLeft()) return left(played.value)

    const finished = finishIfOver(battle, engine, this.clock.now())
    if (finished.isLeft()) return left(finished.value)

    // a pré-batalha só serve uma vez: se outra requisição já a usou (clique duplo), esta não cria outra batalha
    const claimed = await this.battleDraftsRepository.delete(draft)
    if (!claimed) return left(new ResourceNotFoundError('pré-batalha'))

    await this.battlesRepository.create(battle)

    const { rewards, loot } = await deliverBattleRewards(battle, engine, {
      charactersRepository: this.charactersRepository,
      battlesRepository: this.battlesRepository,
      skillOffersRepository: this.skillOffersRepository,
      walletsRepository: this.walletsRepository,
      chestsRepository: this.chestsRepository,
      catalog,
      now: this.clock.now(),
    })

    return right({ battle, engine, events: engine.events, rewards, loot })
  }
}
