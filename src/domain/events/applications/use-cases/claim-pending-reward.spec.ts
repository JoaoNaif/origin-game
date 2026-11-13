import { beforeEach, describe, expect, it } from 'vitest'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Gear } from '@/domain/gear/entities/gear'
import { makePveWorld, PveWorld } from 'test/factories/make-pve-world'
import { PendingReward } from '../../entities/pending-reward'
import { InvalidPendingRewardError } from '../../errors/invalid-pending-reward-error'
import { ClaimPendingRewardUseCase } from './claim-pending-reward'
import { DiscardPendingRewardUseCase } from './discard-pending-reward'
import { FetchRewardBoxUseCase } from './fetch-reward-box'

let world: PveWorld
let sut: ClaimPendingRewardUseCase
let pending: PendingReward

function rewardsDeps() {
  return {
    charactersRepository: world.characters,
    walletsRepository: world.wallets,
    chestsRepository: world.chests,
    gearRepository: world.gear,
    beastsRepository: world.beasts,
    pendingRewardsRepository: world.pendingRewards,
  }
}

async function fillInventory() {
  const slots = (
    await world.wallets.findByAccountId(world.account.id.toString())
  ).inventorySlots
  const template = [...world.catalog.gearTemplates.values()][0]
  for (let i = 0; i < slots; i++) {
    await world.gear.create(
      Gear.create({
        accountId: world.account.id,
        templateId: template.id,
        source: 'ADMIN',
        acquiredAt: new Date('2026-10-24T00:00:00Z'),
      })
    )
  }
}

describe('Claim Pending Reward', () => {
  beforeEach(async () => {
    world = await makePveWorld()
    pending = PendingReward.create({
      accountId: world.account.id,
      reward: { type: 'BEAST', beastKey: 'lobo-de-cinzas' },
      eventId: null,
      createdAt: new Date('2026-10-24T11:00:00Z'),
    })
    await world.pendingRewards.create(pending)
    sut = new ClaimPendingRewardUseCase(
      world.pendingRewards,
      world.accounts,
      world.catalogRepository,
      rewardsDeps(),
      world.clock
    )
  })

  it('should be able to claim the reward into the inventory', async () => {
    const result = await sut.execute({
      accountId: world.account.id.toString(),
      pendingRewardId: pending.id.toString(),
    })

    expect(result.isRight()).toBe(true)
    expect(world.beasts.items).toHaveLength(1)
    expect(world.beasts.items[0].source).toBe('EVENT')
    expect(world.pendingRewards.items).toHaveLength(0)
  })

  it('should not be able to claim with the inventory still full', async () => {
    await fillInventory()

    const result = await sut.execute({
      accountId: world.account.id.toString(),
      pendingRewardId: pending.id.toString(),
    })

    expect(result.value).toBeInstanceOf(InvalidPendingRewardError)
    expect(world.pendingRewards.items).toHaveLength(1)
  })

  it('should not be able to claim after the deadline', async () => {
    const old = PendingReward.create({
      accountId: world.account.id,
      reward: { type: 'BEAST', beastKey: 'lobo-de-cinzas' },
      eventId: null,
      createdAt: new Date('2026-10-01T00:00:00Z'),
    })
    await world.pendingRewards.create(old)

    const result = await sut.execute({
      accountId: world.account.id.toString(),
      pendingRewardId: old.id.toString(),
    })

    expect(result.value).toBeInstanceOf(InvalidPendingRewardError)
  })

  it('should not be able to claim a reward of another account', async () => {
    const result = await sut.execute({
      accountId: new UniqueEntityId().toString(),
      pendingRewardId: pending.id.toString(),
    })

    expect(result.value).toBeInstanceOf(NotAllowedError)
  })

  it('should be able to discard the reward', async () => {
    const result = await new DiscardPendingRewardUseCase(
      world.pendingRewards
    ).execute({
      accountId: world.account.id.toString(),
      pendingRewardId: pending.id.toString(),
    })

    expect(result.isRight()).toBe(true)
    expect(world.pendingRewards.items).toHaveLength(0)
    expect(world.beasts.items).toHaveLength(0)
  })

  it('should be able to list only the rewards still within the deadline', async () => {
    await world.pendingRewards.create(
      PendingReward.create({
        accountId: world.account.id,
        reward: { type: 'GEAR', gearKey: 'egide-cinzenta' },
        eventId: null,
        createdAt: new Date('2026-09-01T00:00:00Z'),
      })
    )

    const result = await new FetchRewardBoxUseCase(
      world.pendingRewards,
      world.clock
    ).execute({ accountId: world.account.id.toString() })

    expect(result.value.rewards.map((r) => r.id.toString())).toEqual([
      pending.id.toString(),
    ])
    expect(result.value.rewards[0].expiresAt).toEqual(
      new Date('2026-11-07T11:00:00Z')
    )
  })
})
