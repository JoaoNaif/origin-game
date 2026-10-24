import { SeededRng } from '@/core/rng/seeded-rng'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { SkillOffersRepository } from '@/domain/characters/applications/repositories/skill-offers-repository'
import { skillOffersOnLevelUp } from '@/domain/characters/applications/services/skill-offers-on-level-up'
import { BattleEngine } from '../../engine/battle-engine'
import { Battle } from '../../entities/battle'
import { BattleSide, BattleStatus } from '../../enums/battle-enums'
import { BattleReward } from '../../value-objects/battle-reward'
import { battleMetrics, battleXp, SAME_NPC_XP } from '../../services/battle-xp'
import { BattlesRepository } from '../repositories/battles-repository'

/** O que cada personagem ganhou (`BattleReward`, guardado na batalha). */
export type CharacterReward = BattleReward

export interface BattleRewardsDeps {
  charactersRepository: CharactersRepository
  battlesRepository: BattlesRepository
  skillOffersRepository: SkillOffersRepository
  catalog: GameCatalog
  now: Date
}

/** Sal da sorte dos blocos de skill: derivada da seed da batalha, separada da do motor e da IA. */
const SKILL_OFFER_SEED_SALT = 0x2545f491

/**
 * Entrega o XP do fim da batalha PvE (D76, D92) aos 4 personagens que entraram e grava, com os blocos de skill dos
 * níveis atravessados (D77, D135). Personagem que já não está na conta fica sem XP.
 */
export async function grantBattleXp(
  battle: Battle,
  engine: BattleEngine,
  deps: BattleRewardsDeps
): Promise<CharacterReward[]> {
  const { charactersRepository, battlesRepository, skillOffersRepository } =
    deps
  if (!battle.isFinished || !battle.aiDifficulty) return []

  const units = battle.snapshot.player.units.filter((u) => u.characterId)
  const characterIds = units.map((u) => u.characterId!)
  const [characters, accountCharacters, recent, pending] = await Promise.all([
    charactersRepository.findManyByIds(characterIds),
    charactersRepository.findManyByAccountId(battle.accountId.toString()),
    battlesRepository.listByAccountId(battle.accountId.toString(), {
      status: BattleStatus.FINISHED,
      limit: SAME_NPC_XP.window + 1,
    }),
    skillOffersRepository.findPendingByCharacterIds(characterIds),
  ])

  const sameNpcRepeats = recent
    .filter((b) => b.id !== battle.id.toString())
    .slice(0, SAME_NPC_XP.window)
    .filter(
      (b) => battle.npcSquadId && b.npcSquadId === battle.npcSquadId.toString()
    ).length
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
    difficulty: battle.aiDifficulty,
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
        kills: 0,
      },
    })),
  })

  const rng = new SeededRng((battle.seed ^ SKILL_OFFER_SEED_SALT) >>> 0)
  const rewards: CharacterReward[] = []
  for (const unit of units) {
    const character = characters.find(
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
