import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { SeededRng } from '@/core/rng/seeded-rng'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { SkillOffersRepository } from '@/domain/characters/applications/repositories/skill-offers-repository'
import { AiDifficulty } from '@/domain/ai/enums/ai-difficulty'
import {
  skillOffersOnAwakening,
  skillOffersOnLevelUp,
} from '@/domain/characters/applications/services/skill-offers-on-level-up'
import { Character } from '@/domain/characters/entities/character'
import { drawAwakening } from '@/domain/characters/services/awakening-draw'
import { AwakeningBattleStats } from '@/domain/characters/value-objects/awakening-progress'
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
import { awakeningBattleStats } from '../../services/awakening-stats'
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

/** Sal da sorte do sorteio do despertar e das missões (D151). */
const AWAKENING_SEED_SALT = 0x1b873593

/** Anti-farm do despertar no PvE (D96): a partir do Intermediário e contra NPC fora das últimas 5 batalhas. */
export const AWAKENING_PVE_RULES = {
  minDifficulty: AiDifficulty.INTERMEDIATE,
  distinctNpcWindow: 5,
} as const

const DIFFICULTY_ORDER: readonly AiDifficulty[] = Object.values(AiDifficulty)

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
  const previous = recent.filter((b) => b.id !== battle.id.toString())
  const sameNpc = (b: { npcSquadId: string | null }) =>
    !!battle.npcSquadId && b.npcSquadId === battle.npcSquadId.toString()
  const sameNpcRepeats = previous
    .slice(0, SAME_NPC_XP.window)
    .filter(sameNpc).length

  const countsForAwakening =
    DIFFICULTY_ORDER.indexOf(battle.aiDifficulty) >=
      DIFFICULTY_ORDER.indexOf(AWAKENING_PVE_RULES.minDifficulty) &&
    !previous.slice(0, AWAKENING_PVE_RULES.distinctNpcWindow).some(sameNpc)

  const rewards = await grantBattleXp(
    battle,
    engine,
    { sameNpcRepeats, countsForAwakening },
    deps
  )
  const loot = await grantBattleLoot(battle, sameNpcRepeats, deps)

  const recorded = [
    rewards.length > 0 && battle.recordRewards(rewards).isRight(),
    battle.recordLoot(loot).isRight(),
  ]
  if (recorded.some(Boolean)) await deps.battlesRepository.saveRewards(battle)

  return { rewards, loot }
}

/**
 * XP do fim (D76, D92) e o despertar (D151): as missões ocultas de quem já sorteou (se a batalha conta), o despertar
 * de quem cumpriu as 3 (com os blocos de recuperação) e o sorteio de quem já está no nível 80. Personagem que já não
 * está na conta fica sem nada.
 */
async function grantBattleXp(
  battle: Battle,
  engine: BattleEngine,
  {
    sameNpcRepeats,
    countsForAwakening,
  }: { sameNpcRepeats: number; countsForAwakening: boolean },
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

  const awakeningStats = playerAwakeningStats(battle, engine)
  const rng = new SeededRng((battle.seed ^ SKILL_OFFER_SEED_SALT) >>> 0)
  const awakeningRng = new SeededRng((battle.seed ^ AWAKENING_SEED_SALT) >>> 0)
  const rewards: CharacterReward[] = []
  for (const unit of units) {
    const character: Character | undefined = characters.find(
      (c) => c.id.toString() === unit.characterId
    )
    if (!character) continue

    const amount = xp.get(unit.ref) ?? 0
    const fromLevel = character.level
    const levelsGained = character.gainXp(amount)
    const characterPending = pending.filter((o) =>
      o.characterId.equals(character.id)
    )

    const offers = skillOffersOnLevelUp({
      character,
      fromLevel,
      catalog: deps.catalog,
      pending: characterPending,
      rng,
      now: deps.now,
    })

    const awakened =
      countsForAwakening &&
      advanceAwakening(character, awakeningStats.get(unit.ref), deps.catalog)
    if (awakened) {
      offers.push(
        ...skillOffersOnAwakening({
          character,
          catalog: deps.catalog,
          pending: [...characterPending, ...offers],
          rng,
          now: deps.now,
        })
      )
    }

    // sorteio depois das missões: elas só contam a partir da batalha seguinte
    const template = deps.catalog.templates.get(character.templateId.toValue())
    const drawn = template
      ? drawAwakening({
          character,
          template,
          awakenings: deps.catalog.awakenings.values(),
          rng: awakeningRng,
          now: deps.now,
        })
      : null
    if (drawn) character.startAwakening(drawn)

    await charactersRepository.save(character)
    if (offers.length > 0) await skillOffersRepository.createMany(offers)

    rewards.push({
      characterId: unit.characterId!,
      xp: amount,
      levelsGained,
      level: character.level,
      newSkillOffers: offers.length,
      ...(awakened ? { awakened: true } : {}),
    })
  }

  return rewards
}

/** O que a batalha mediu de cada personagem do jogador para as missões do despertar (D151). */
function playerAwakeningStats(
  battle: Battle,
  engine: BattleEngine
): Map<string, AwakeningBattleStats> {
  const { player, opponent } = battle.snapshot
  const refs = player.units.map((u) => u.ref)

  return awakeningBattleStats({
    events: engine.events,
    side: BattleSide.PLAYER,
    refs,
    aliveRefs: refs.filter((ref) => engine.unit(ref).alive),
    won: battle.winner === BattleSide.PLAYER,
    enemyTotalHp: opponent.units.reduce(
      (sum, u) => sum + engine.unit(u.ref).maxHp,
      0
    ),
    tierOf: (ref, skillKey) =>
      player.units
        .find((u) => u.ref === ref)
        ?.skills.find((s) => s.key === skillKey)?.tier ?? null,
  })
}

/** Soma a batalha nas missões e desperta quem cumpriu as 3 (D151). Devolve se despertou. */
function advanceAwakening(
  character: Character,
  stats: AwakeningBattleStats | undefined,
  catalog: GameCatalog
): boolean {
  if (!stats || !character.recordAwakeningBattle(stats)) return false

  const awakening = catalog.awakenings.get(
    character.awakening!.awakeningId.toValue()
  )
  const variant = awakening
    ? catalog.variants.get(awakening.variantId.toValue())
    : undefined
  const template = catalog.templates.get(character.templateId.toValue())
  if (!variant || !template) return false

  return character.awaken(variant, template).isRight()
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
