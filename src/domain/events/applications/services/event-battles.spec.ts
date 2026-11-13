import { beforeEach, describe, expect, it } from 'vitest'
import { StartPveBattleUseCase } from '@/domain/combat/applications/use-cases/start-pve-battle'
import { Battle } from '@/domain/combat/entities/battle'
import { BattleSide } from '@/domain/combat/enums/battle-enums'
import { Gear } from '@/domain/gear/entities/gear'
import { makePveWorld, PveWorld } from 'test/factories/make-pve-world'
import { InvalidEventError } from '../../errors/invalid-event-error'
import { DraftEventBattleUseCase } from '../use-cases/draft-event-battle'

let world: PveWorld

function eventOf(key: string) {
  return [...world.catalog.events.values()].find((e) => e.key === key)!
}

/** Pré-batalha do evento e início com o squad do mundo; devolve o resultado do início. */
async function startEventBattle(eventKey: string, squadId?: string) {
  const accountId = world.account.id.toString()
  const drafted = await new DraftEventBattleUseCase(
    world.accounts,
    world.catalogRepository,
    world.drafts,
    world.eventBattles,
    world.seeds,
    world.clock
  ).execute({ accountId, eventKey })
  if (drafted.isLeft()) return drafted

  return new StartPveBattleUseCase(
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
    squadId: squadId ?? world.squad.id.toString(),
  })
}

/** Começa e encerra à força com o vencedor dado; entrega o evento. */
async function playEventBattle(eventKey: string, winner: BattleSide) {
  const started = await startEventBattle(eventKey)
  if (started.isLeft()) throw started.value
  const battle = started.value.battle as Battle
  battle.finish({
    winner,
    reason: 'ELIMINATION',
    rounds: 5,
    finishedAt: world.clock.now(),
  })

  return {
    battle,
    outcome: await world.eventBattles.deliver(
      battle,
      world.catalog,
      world.clock.now()
    ),
  }
}

async function entryOf(eventKey: string) {
  return world.eventEntries.findByAccountAndEvent(
    world.account.id.toString(),
    eventOf(eventKey).id.toString()
  )
}

describe('Event Battles', () => {
  beforeEach(async () => {
    world = await makePveWorld(45)
  })

  it('should be able to start an event battle on the stage squad and count the attempt', async () => {
    const result = await startEventBattle('torre-do-eco')

    expect(result.isRight()).toBe(true)
    if (result.isLeft()) return
    expect(result.value.battle.event).toEqual({
      eventId: eventOf('torre-do-eco').id.toString(),
      stage: 0,
    })
    expect(result.value.battle.npcSquadId?.toString()).toBe(
      world.catalog.npcSquads
        .find((s) => s.key === 'aggressive-beginner')!
        .id.toString()
    )
    expect((await entryOf('torre-do-eco'))?.attemptsTotal).toBe(1)
  })

  it('should be able to clear a tower floor and pay the floor and participation rewards', async () => {
    const { outcome } = await playEventBattle('torre-do-eco', BattleSide.PLAYER)

    expect(outcome?.stageCleared).toBe(true)
    expect(outcome?.completed).toBe(false)
    expect(outcome?.rewards.map((r) => r.source)).toEqual([
      'PARTICIPATION',
      'STAGE',
    ])
    expect((await entryOf('torre-do-eco'))?.clearedStages).toBe(1)
  })

  it('should not go back on a loss: the same floor is played again', async () => {
    await playEventBattle('torre-do-eco', BattleSide.PLAYER)
    const { outcome, battle } = await playEventBattle(
      'torre-do-eco',
      BattleSide.OPPONENT
    )

    expect(battle.event?.stage).toBe(1)
    expect(outcome?.stageCleared).toBe(false)
    expect(outcome?.rewards).toEqual([])
    expect((await entryOf('torre-do-eco'))?.clearedStages).toBe(1)
  })

  it('should be able to complete the event and pay the main reward', async () => {
    const tower = eventOf('torre-do-eco')
    let last = null
    for (let i = 0; i < tower.stages.length; i++) {
      last = (await playEventBattle('torre-do-eco', BattleSide.PLAYER)).outcome
    }

    expect(last?.completed).toBe(true)
    expect(
      last?.rewards
        .filter((r) => r.source === 'COMPLETION')
        .map((r) => r.status)
    ).toEqual(['DELIVERED', 'DELIVERED'])
    expect(world.gear.items).toHaveLength(1)
    expect(world.chests.items.some((c) => c.source === 'EVENT')).toBe(true)

    const again = await startEventBattle('torre-do-eco')
    expect(again.value).toBeInstanceOf(InvalidEventError)
  })

  it('should be able to give the launched character on completion', async () => {
    await playEventBattle('chegada-de-dax', BattleSide.PLAYER)
    const { outcome } = await playEventBattle(
      'chegada-de-dax',
      BattleSide.PLAYER
    )

    const dax = outcome?.rewards.find((r) => r.source === 'COMPLETION')
    expect(dax?.status).toBe('DELIVERED')
    const owned = await world.characters.findManyByAccountId(
      world.account.id.toString()
    )
    expect(
      owned.some((c) => c.id.toString() === (dax as { refId: string }).refId)
    ).toBe(true)
  })

  it('should not be able to play again a unique boss after losing', async () => {
    const { outcome } = await playEventBattle(
      'chefe-das-cinzas',
      BattleSide.OPPONENT
    )
    expect(outcome?.stageCleared).toBe(false)

    const again = await startEventBattle('chefe-das-cinzas')

    expect(again.value).toBeInstanceOf(InvalidEventError)
    expect((again.value as Error).message).toMatch(/sem tentativas/)
  })

  it('should not be able to enter without the requirements', async () => {
    world = await makePveWorld(18)

    const result = await startEventBattle('chefe-das-cinzas')

    expect(result.value).toBeInstanceOf(InvalidEventError)
    expect((result.value as Error).message).toMatch(/nível 40/)
    expect(await entryOf('chefe-das-cinzas')).toBeNull()
  })

  it('should be able to apply the research modifiers on the battle', async () => {
    const result = await startEventBattle('laboratorio-da-sombra')
    if (result.isLeft()) throw result.value
    const { snapshot } = result.value.battle

    expect(snapshot.rules).toEqual({ noHealing: true })
    expect(snapshot.player.units.every((u) => u.level === 30)).toBe(true)
    expect(snapshot.field.initial?.key).toBe('arena')
  })

  it('should not be able to swap the squad of a fixed squad event', async () => {
    await startEventBattle('laboratorio-da-sombra')
    const [first, ...rest] = world.squad.members
    const other = world.roster.find(
      (c) => !world.squad.members.some((m) => m.characterId.equals(c.id))
    )!
    const { makeSquad } = await import('test/factories/make-squad')
    const swapped = makeSquad({
      account: world.account,
      name: 'Outro',
      members: [
        { character: other, row: first.row, column: first.column },
        ...rest.map((m) => ({
          character: world.roster.find((c) => c.id.equals(m.characterId))!,
          row: m.row,
          column: m.column,
        })),
      ],
    })
    await world.squads.create(swapped)

    const result = await startEventBattle(
      'laboratorio-da-sombra',
      swapped.id.toString()
    )

    expect(result.value).toBeInstanceOf(InvalidEventError)
    expect((result.value as Error).message).toMatch(/fixo/)
  })

  it('should be able to roll the hunt capture and raise the chance after a failure', async () => {
    const outcomes = []
    for (let i = 0; i < 6; i++) {
      const { outcome } = await playEventBattle(
        'caca-ao-lobo',
        BattleSide.PLAYER
      )
      outcomes.push(outcome!)
      if (outcome!.capture?.captured) break
    }

    // Lobo de Cinzas é Cavaleiro: 60%, +10 pontos por falha
    outcomes.forEach((o, i) =>
      expect(o.capture?.chance).toBeCloseTo(Math.min(1, 0.6 + 0.1 * i))
    )
    const last = outcomes.at(-1)!
    expect(last.capture?.captured).toBe(true)
    expect(last.completed).toBe(true)
    expect(world.beasts.items).toHaveLength(1)
  })

  it('should be able to send the reward to the box when the inventory is full', async () => {
    const accountId = world.account.id.toString()
    const slots = (await world.wallets.findByAccountId(accountId))
      .inventorySlots
    const gearTemplate = [...world.catalog.gearTemplates.values()][0]
    for (let i = 0; i < slots; i++) {
      await world.gear.create(
        Gear.create({
          accountId: world.account.id,
          templateId: gearTemplate.id,
          source: 'ADMIN',
          acquiredAt: world.clock.now(),
        })
      )
    }

    let last = null
    for (let i = 0; i < eventOf('torre-do-eco').stages.length; i++) {
      last = (await playEventBattle('torre-do-eco', BattleSide.PLAYER)).outcome
    }

    const gear = last?.rewards.find((r) => r.reward.type === 'GEAR')
    expect(gear?.status).toBe('PENDING')
    expect(world.pendingRewards.items).toHaveLength(1)
  })

  it('should not deliver anything on a forfeit', async () => {
    const started = await startEventBattle('torre-do-eco')
    if (started.isLeft()) throw started.value
    const battle = started.value.battle as Battle
    battle.forfeit(world.clock.now())

    const outcome = await world.eventBattles.deliver(
      battle,
      world.catalog,
      world.clock.now()
    )

    expect(outcome).toBeNull()
    expect((await entryOf('torre-do-eco'))?.participated).toBe(false)
  })
})
