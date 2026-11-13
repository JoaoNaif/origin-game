import { beforeEach, describe, expect, it } from 'vitest'
import { makeAccount } from 'test/factories/make-account'
import { gearTemplateOf, makeGear } from 'test/factories/make-gear'
import { beastTemplateOf, makeBeast } from 'test/factories/make-beast'
import { playPveBattle } from 'test/factories/play-pve-battle'
import { makePveWorld, PveWorld } from 'test/factories/make-pve-world'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { BattleSide } from '../../enums/battle-enums'
import { DraftPveBattleUseCase } from './draft-pve-battle'
import { StartPveBattleUseCase } from './start-pve-battle'

let world: PveWorld
let draftId: string
let sut: StartPveBattleUseCase

describe('Start Pve Battle', () => {
  beforeEach(async () => {
    world = await makePveWorld()
    const drafted = await new DraftPveBattleUseCase(
      world.accounts,
      world.catalogRepository,
      world.drafts,
      world.seeds,
      world.clock
    ).execute({
      accountId: world.account.id.toString(),
      npcSquadKey: 'balanced-beginner',
    })
    if (drafted.isLeft()) throw drafted.value
    draftId = drafted.value.draft.id.toString()

    sut = new StartPveBattleUseCase(
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
    )
  })

  it('should be able to start the battle and stop on the player turn', async () => {
    const result = await sut.execute({
      accountId: world.account.id.toString(),
      draftId,
      squadId: world.squad.id.toString(),
    })

    expect(result.isRight()).toBe(true)
    if (result.isRight()) {
      const { battle, engine } = result.value
      expect(world.battles.items).toEqual([battle])
      expect(world.drafts.items).toHaveLength(0)
      expect(battle.seed).toBe(42)
      expect(battle.snapshot.field.initial?.key).toBeDefined()
      expect(battle.snapshot.player.units.map((u) => u.characterId)).toEqual(
        world.squad.members.map((m) => m.characterId.toString())
      )
      // tudo que a máquina jogou ficou no log, e agora é a vez do jogador
      expect(battle.actions.every((a) => a.side === BattleSide.OPPONENT)).toBe(
        true
      )
      expect(engine.nextTurn()?.side).toBe(BattleSide.PLAYER)
    }
  })

  it('should be able to take the gear in the slot, with the bond fixed for the battle', async () => {
    const template = gearTemplateOf(world.catalog, 'couraca-de-pedra')
    const gear = makeGear(world.account, template)
    const holder = world.squad.members[0].characterId
    gear.equipOn(world.account.id, holder)
    await world.gear.create(gear)

    const result = await sut.execute({
      accountId: world.account.id.toString(),
      draftId,
      squadId: world.squad.id.toString(),
    })

    expect(result.isRight()).toBe(true)
    if (result.isLeft()) return
    const [first, ...others] = result.value.battle.snapshot.player.units
    expect(first.characterId).toBe(holder.toString())
    expect(first.gear).toMatchObject({
      key: 'couraca-de-pedra',
      grade: 'SQUIRE',
      lineage: 'MATERIAL',
    })
    expect(['FULL', 'PARTIAL', 'NONE']).toContain(first.gear?.bond)
    expect(others.every((u) => u.gear === undefined)).toBe(true)
  })

  it('should be able to take the contracted beasts: the summon in its slot and the beast out of the field', async () => {
    const holder = world.squad.members[0].characterId
    for (const key of ['lobo-de-cinzas', 'serpente-espelho']) {
      const beast = makeBeast(
        world.account,
        beastTemplateOf(world.catalog, key)
      )
      const owner =
        key === 'lobo-de-cinzas' ? holder : world.squad.members[1].characterId
      beast.contractWith(world.account.id, owner, 4)
      await world.beasts.create(beast)
    }

    const result = await sut.execute({
      accountId: world.account.id.toString(),
      draftId,
      squadId: world.squad.id.toString(),
    })

    expect(result.isRight()).toBe(true)
    if (result.isLeft()) return
    const { player } = result.value.battle.snapshot
    expect(player.units[0].skills[3]).toMatchObject({
      beastKey: 'lobo-de-cinzas',
      singleUse: true,
    })
    expect(player.units[1].skills[3].beastKey).toBe('serpente-espelho')
    // a Igualdade não entra na grade: só o lobo vira unidade
    expect(player.beasts?.map((b) => b.ref)).toEqual(['PLAYER:B0'])
    expect(player.beasts?.[0].beast).toMatchObject({
      ownerRef: 'PLAYER:0',
      contract: 'DOMINANCE',
      auto: true,
    })
  })

  it('should be able to play a whole battle with beasts, the Dominância one played by the machine', async () => {
    const holder = world.squad.members[0].characterId
    const wolf = makeBeast(
      world.account,
      beastTemplateOf(world.catalog, 'lobo-de-cinzas')
    )
    wolf.contractWith(world.account.id, holder, 1)
    await world.beasts.create(wolf)

    const { battle } = await playPveBattle(world, 'balanced-beginner')

    expect(battle.isFinished).toBe(true)
    // a vez automática da besta fica gravada como ação do lado do jogador
    const beastActions = battle.actions.filter(
      (a) => a.actorRef === 'PLAYER:B0'
    )
    const summoned = battle.actions.some(
      (a) =>
        a.payload.type === 'SKILL' && a.payload.skillKey.startsWith('summon:')
    )
    expect(summoned).toBe(true)
    expect(beastActions.length).toBeGreaterThan(0)
  })

  it('should be able to start only one battle from a draft (double submit)', async () => {
    const request = {
      accountId: world.account.id.toString(),
      draftId,
      squadId: world.squad.id.toString(),
    }

    const results = await Promise.all([
      sut.execute(request),
      sut.execute(request),
    ])

    expect(results.filter((r) => r.isRight())).toHaveLength(1)
    expect(results.find((r) => r.isLeft())?.value).toBeInstanceOf(
      ResourceNotFoundError
    )
    expect(world.battles.items).toHaveLength(1)
  })

  it('should not be able to start with a squad of another account', async () => {
    const other = makeAccount({ username: 'outra_conta' })
    await world.accounts.create(other)
    const otherDraft = await new DraftPveBattleUseCase(
      world.accounts,
      world.catalogRepository,
      world.drafts,
      world.seeds,
      world.clock
    ).execute({
      accountId: other.id.toString(),
      npcSquadKey: 'balanced-beginner',
    })
    if (otherDraft.isLeft()) throw otherDraft.value

    const result = await sut.execute({
      accountId: other.id.toString(),
      draftId: otherDraft.value.draft.id.toString(),
      squadId: world.squad.id.toString(),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(NotAllowedError)
  })

  it('should not be able to use the draft of another account', async () => {
    const result = await sut.execute({
      accountId: 'outra-conta',
      draftId,
      squadId: world.squad.id.toString(),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(NotAllowedError)
    expect(world.drafts.items).toHaveLength(1)
  })

  it('should not be able to start from an unknown draft', async () => {
    const result = await sut.execute({
      accountId: world.account.id.toString(),
      draftId: 'ninguem',
      squadId: world.squad.id.toString(),
    })

    expect(result.isLeft()).toBe(true)
    expect(result.value).toBeInstanceOf(ResourceNotFoundError)
  })
})
