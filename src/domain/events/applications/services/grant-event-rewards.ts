import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { Account } from '@/domain/accounts/entities/account'
import { BeastsRepository } from '@/domain/beasts/applications/repositories/beasts-repository'
import { Beast } from '@/domain/beasts/entities/beast'
import { BeastSource } from '@/domain/beasts/enums/beast-source'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { templateKit } from '@/domain/catalog/services/template-skills'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { Character } from '@/domain/characters/entities/character'
import { RARITY_SALE_VALUE } from '@/domain/economy/economy-values'
import { ChestsRepository } from '@/domain/economy/applications/repositories/chests-repository'
import { WalletsRepository } from '@/domain/economy/applications/repositories/wallets-repository'
import { creditWallet } from '@/domain/economy/applications/services/credit-wallet'
import { inventoryUsage } from '@/domain/economy/applications/services/inventory-usage'
import { Chest } from '@/domain/economy/entities/chest'
import { ChestSource } from '@/domain/economy/enums/chest-source'
import { WalletReason } from '@/domain/economy/enums/wallet-reason'
import {
  addFragments,
  Fragments,
} from '@/domain/economy/value-objects/fragments'
import { GearRepository } from '@/domain/gear/applications/repositories/gear-repository'
import { Gear } from '@/domain/gear/entities/gear'
import { GearSource } from '@/domain/gear/enums/gear-source'
import { PendingReward } from '../../entities/pending-reward'
import { GrantedEventReward } from '../../value-objects/event-battle-outcome'
import { EventReward } from '../../value-objects/event-reward'
import { PendingRewardsRepository } from '../repositories/pending-rewards-repository'

export interface EventRewardsDeps {
  charactersRepository: CharactersRepository
  walletsRepository: WalletsRepository
  chestsRepository: ChestsRepository
  gearRepository: GearRepository
  beastsRepository: BeastsRepository
  pendingRewardsRepository: PendingRewardsRepository
}

export interface GrantEventRewardsInput {
  account: Account
  /** O evento de origem (vai na caixa de recompensas); nulo = sem evento. */
  eventId: UniqueEntityId | null
  /** O que causou (batalha), no registro da carteira. */
  refId: string
  rewards: readonly EventReward[]
  catalog: GameCatalog
  now: Date
}

/**
 * Entrega os prêmios do evento (D155, `events_brief.md` 4): moeda, fragmentos e baú direto; personagem no Elenco
 * (repetido vira moeda); equipamento e besta no inventário, ou na caixa de recompensas se não houver espaço.
 */
export async function grantEventRewards(
  input: GrantEventRewardsInput,
  deps: EventRewardsDeps
): Promise<GrantedEventReward[]> {
  const { account, catalog, now } = input
  const accountId = account.id.toString()
  if (input.rewards.length === 0) return []

  const [owned, used, wallet] = await Promise.all([
    deps.charactersRepository.findManyByAccountId(accountId),
    inventoryUsage(deps.gearRepository, deps.beastsRepository, accountId),
    deps.walletsRepository.findByAccountId(accountId),
  ])
  const ownedTemplates = new Set(owned.map((c) => c.templateId.toValue()))
  let freeSlots = Math.max(0, wallet.inventorySlots - used)

  let coins = 0
  let fragments: Fragments = {}
  const granted: GrantedEventReward[] = []

  const toBox = async (reward: EventReward): Promise<GrantedEventReward> => {
    const pending = PendingReward.create({
      accountId: account.id,
      reward,
      eventId: input.eventId,
      createdAt: now,
    })
    await deps.pendingRewardsRepository.create(pending)
    return {
      reward,
      status: 'PENDING',
      pendingId: pending.id.toString(),
      expiresAt: pending.expiresAt.toISOString(),
    }
  }

  for (const reward of input.rewards) {
    switch (reward.type) {
      case 'COINS':
        coins += reward.amount
        granted.push({ reward, status: 'DELIVERED', refId: null })
        break

      case 'FRAGMENTS':
        fragments = addFragments(fragments, { [reward.lineage]: reward.amount })
        granted.push({ reward, status: 'DELIVERED', refId: null })
        break

      case 'CHEST': {
        const chest = Chest.create({
          accountId: account.id,
          tier: reward.tier,
          source: ChestSource.EVENT,
          createdAt: now,
        })
        await deps.chestsRepository.create(chest)
        granted.push({
          reward,
          status: 'DELIVERED',
          refId: chest.id.toString(),
        })
        break
      }

      case 'CHARACTER': {
        const template = [...catalog.templates.values()].find(
          (t) => t.key === reward.templateKey
        )
        if (!template) {
          granted.push({ reward, status: 'MISSING' })
          break
        }
        if (ownedTemplates.has(template.id.toValue())) {
          const value = RARITY_SALE_VALUE[template.rarity]
          coins += value
          granted.push({ reward, status: 'CONVERTED', coins: value })
          break
        }

        const created = Character.create({
          account,
          template,
          familyTrait: template.familyTraitId
            ? catalog.traits.get(template.familyTraitId.toValue())
            : null,
          kitSkills: templateKit(catalog, template),
        })
        if (created.isLeft()) {
          granted.push({ reward, status: 'MISSING' })
          break
        }
        await deps.charactersRepository.createMany([created.value])
        ownedTemplates.add(template.id.toValue())
        granted.push({
          reward,
          status: 'DELIVERED',
          refId: created.value.id.toString(),
        })
        break
      }

      case 'GEAR': {
        const template = [...catalog.gearTemplates.values()].find(
          (g) => g.key === reward.gearKey
        )
        if (!template) {
          granted.push({ reward, status: 'MISSING' })
          break
        }
        if (freeSlots <= 0) {
          granted.push(await toBox(reward))
          break
        }
        const gear = Gear.create({
          accountId: account.id,
          templateId: template.id,
          source: GearSource.EVENT,
          acquiredAt: now,
        })
        await deps.gearRepository.create(gear)
        freeSlots -= 1
        granted.push({ reward, status: 'DELIVERED', refId: gear.id.toString() })
        break
      }

      case 'BEAST': {
        const template = [...catalog.beastTemplates.values()].find(
          (b) => b.key === reward.beastKey
        )
        if (!template) {
          granted.push({ reward, status: 'MISSING' })
          break
        }
        if (freeSlots <= 0) {
          granted.push(await toBox(reward))
          break
        }
        const beast = Beast.create({
          accountId: account.id,
          templateId: template.id,
          source: BeastSource.EVENT,
          acquiredAt: now,
        })
        await deps.beastsRepository.create(beast)
        freeSlots -= 1
        granted.push({
          reward,
          status: 'DELIVERED',
          refId: beast.id.toString(),
        })
        break
      }
    }
  }

  if (coins > 0 || Object.keys(fragments).length > 0) {
    await creditWallet(deps.walletsRepository, accountId, {
      reason: WalletReason.EVENT_REWARD,
      refId: input.refId,
      coins,
      fragments,
    })
  }

  return granted
}
