import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { SeededRng } from '@/core/rng/seeded-rng'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { SkillOffersRepository } from '@/domain/characters/applications/repositories/skill-offers-repository'
import { skillOffersOnLevelUp } from '@/domain/characters/applications/services/skill-offers-on-level-up'
import { Character } from '@/domain/characters/entities/character'
import { ChestsRepository } from '@/domain/economy/applications/repositories/chests-repository'
import { WalletsRepository } from '@/domain/economy/applications/repositories/wallets-repository'
import { creditWallet } from '@/domain/economy/applications/services/credit-wallet'
import { Chest } from '@/domain/economy/entities/chest'
import { ChestSource } from '@/domain/economy/enums/chest-source'
import { WalletReason } from '@/domain/economy/enums/wallet-reason'
import { battleLoot } from '@/domain/economy/services/battle-loot'
import { BattleLoot } from '@/domain/economy/value-objects/battle-loot'
import { BattleEngine } from '../../engine/battle-engine'
import { Battle } from '../../entities/battle'
import { BattleSide, BattleStatus } from '../../enums/battle-enums'
import { BattleReward } from '../../value-objects/battle-reward'
import {
  battleMetrics,
  battleXp,
  PVE_XP_MULTIPLIER,
  SAME_NPC_XP,
} from '../../services/battle-xp'
import { BattlesRepository } from '../repositories/battles-repository'

/** O que cada personagem ganhou (`BattleReward`, guardado na batalha). */
export type CharacterReward = BattleReward

export interface BattleRewardsDeps {
  charactersRepository: CharactersRepository
  battlesRepository: BattlesRepository
  skillOffersRepository: SkillOffersRepository
  walletsRepository: WalletsRepository
  chestsRepository: ChestsRepository
  catalog: GameCatalog
  now: Date
}

export interface DeliveredRewards {
  /** XP por personagem (D134). */
  rewards: CharacterReward[]
  /** Moeda, fragmentos e baú da conta (D150); nulo se a batalha não deu nada (ainda não acabou). */
  loot: BattleLoot | null
}

/** Sal da sorte dos blocos de skill: derivada da seed da batalha, separada da do motor e da IA. */
const SKILL_OFFER_SEED_SALT = 0x2545f491

/** Sal da sorte da moeda, fragmentos e baú do fim (D150). */
const LOOT_SEED_SALT = 0x6c8e9cf5

/**
 * Entrega o fim da batalha PvE e grava na batalha: o XP aos 4 personagens que entraram, com os blocos de skill dos
 * níveis atravessados (D77, D134, D135), e a moeda, os fragmentos e o baú na conta (D100, D104, D150). Só uma vez:
 * quem chama já garantiu que esta requisição é a que encerrou a batalha.
 */
export async function deliverBattleRewards(
  battle: Battle,
  engine: BattleEngine,
  deps: BattleRewardsDeps
): Promise<DeliveredRewards> {
  if (!battle.isFinished || !battle.aiDifficulty) {
    return { rewards: [], loot: null }
  }

  const recent = await deps.battlesRepository.listByAccountId(
    battle.accountId.toString(),
    { status: BattleStatus.FINISHED, limit: SAME_NPC_XP.window + 1 }
  )
  const sameNpcRepeats = recent
    .filter((b) => b.id !== battle.id.toString())
    .slice(0, SAME_NPC_XP.window)
    .filter(
      (b) => battle.npcSquadId && b.npcSquadId === battle.npcSquadId.toString()
    ).length

  const rewards = await grantBattleXp(battle, engine, sameNpcRepeats, deps)
  const loot = await grantBattleLoot(battle, sameNpcRepeats, deps)

  const recorded = [
    rewards.length > 0 && battle.recordRewards(rewards).isRight(),
    battle.recordLoot(loot).isRight(),
  ]
  if (recorded.some(Boolean)) await deps.battlesRepository.saveRewards(battle)

  return { rewards, loot }
}

/** XP do fim (D76, D92). Personagem que já não está na conta fica sem XP. */
async function grantBattleXp(
  battle: Battle,
  engine: BattleEngine,
  sameNpcRepeats: number,
  deps: BattleRewardsDeps
): Promise<CharacterReward[]> {
  const { charactersRepository, skillOffersRepository } = deps

  const units = battle.snapshot.player.units.filter((u) => u.characterId)
  const characterIds = units.map((u) => u.characterId!)
  const [characters, accountCharacters, pending] = await Promise.all([
    charactersRepository.findManyByIds(characterIds),
    charactersRepository.findManyByAccountId(battle.accountId.toString()),
    skillOffersRepository.findPendingByCharacterIds(characterIds),
  ])

  const accountAverageLevel =
    accountCharacters.reduce((sum, c) => sum + c.level, 0) /
    Math.max(1, accountCharacters.length)

  const metrics = battleMetrics(
    engine.events,
    BattleSide.PLAYER,
    (ref) => engine.unit(ref).maxHp
  )
  const xp = battleXp({
    won: battle.winner === BattleSide.PLAYER,
    difficulty: battle.aiDifficulty!,
    sameNpcRepeats,
    accountAverageLevel,
    units: units.map((u) => ({
      ref: u.ref,
      level:
        characters.find((c) => c.id.toString() === u.characterId)?.level ??
        u.level,
      metrics: metrics.get(u.ref) ?? {
        damage: 0,
        heal: 0,
        shield: 0,
        mitigation: 0,
        buff: 0,
        debuff: 0,
        kills: 0,
      },
    })),
  })

  const rng = new SeededRng((battle.seed ^ SKILL_OFFER_SEED_SALT) >>> 0)
  const rewards: CharacterReward[] = []
  for (const unit of units) {
    const character: Character | undefined = characters.find(
      (c) => c.id.toString() === unit.characterId
    )
    if (!character) continue

    const amount = xp.get(unit.ref) ?? 0
    const fromLevel = character.level
    const levelsGained = character.gainXp(amount)
    await charactersRepository.save(character)

    const offers = skillOffersOnLevelUp({
      character,
      fromLevel,
      catalog: deps.catalog,
      pending: pending.filter((o) => o.characterId.equals(character.id)),
      rng,
      now: deps.now,
    })
    if (offers.length > 0) await skillOffersRepository.createMany(offers)

    rewards.push({
      characterId: unit.characterId!,
      xp: amount,
      levelsGained,
      level: character.level,
      newSkillOffers: offers.length,
    })
  }

  return rewards
}

/** Moeda, fragmentos e baú do fim (D150), com os modificadores do XP (dificuldade e mesmo NPC). */
async function grantBattleLoot(
  battle: Battle,
  sameNpcRepeats: number,
  deps: BattleRewardsDeps
): Promise<BattleLoot> {
  const accountId = battle.accountId.toString()
  const draw = battleLoot({
    won: battle.winner === BattleSide.PLAYER,
    modeMultiplier: PVE_XP_MULTIPLIER[battle.aiDifficulty!],
    sameNpcMultiplier: Math.max(
      SAME_NPC_XP.floor,
      1 - SAME_NPC_XP.penalty * sameNpcRepeats
    ),
    unitLineages: battle.snapshot.player.units.map((u) => u.lineages),
    rng: new SeededRng((battle.seed ^ LOOT_SEED_SALT) >>> 0),
  })

  let chest: Chest | null = null
  if (draw.chestTier) {
    chest = Chest.create({
      accountId: new UniqueEntityId(accountId),
      tier: draw.chestTier,
      source: ChestSource.BATTLE,
      battleId: battle.id,
      createdAt: deps.now,
    })
    await deps.chestsRepository.create(chest)
  }

  if (draw.coins > 0 || Object.keys(draw.fragments).length > 0) {
    await creditWallet(deps.walletsRepository, accountId, {
      reason: WalletReason.BATTLE_LOOT,
      refId: battle.id.toString(),
      coins: draw.coins,
      fragments: draw.fragments,
    })
  }

  return {
    coins: draw.coins,
    fragments: draw.fragments,
    chest: chest ? { id: chest.id.toString(), tier: chest.tier } : null,
  }
}
