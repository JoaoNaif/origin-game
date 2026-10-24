import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { BattleEngine } from '../../engine/battle-engine'
import { Battle } from '../../entities/battle'
import { BattleSide, BattleStatus } from '../../enums/battle-enums'
import { battleMetrics, battleXp, SAME_NPC_XP } from '../../services/battle-xp'
import { BattlesRepository } from '../repositories/battles-repository'

export interface CharacterReward {
  characterId: string
  xp: number
  levelsGained: number
  level: number
}

/**
 * Entrega o XP do fim da batalha PvE (D76, D92) aos 4 personagens que entraram e grava. Só a vitória e a derrota
 * contam: amistosa não existe no PvE. Personagem que já não está na conta fica sem XP.
 */
export async function grantBattleXp(
  battle: Battle,
  engine: BattleEngine,
  charactersRepository: CharactersRepository,
  battlesRepository: BattlesRepository
): Promise<CharacterReward[]> {
  if (!battle.isFinished || !battle.aiDifficulty) return []

  const units = battle.snapshot.player.units.filter((u) => u.characterId)
  const [characters, accountCharacters, recent] = await Promise.all([
    charactersRepository.findManyByIds(units.map((u) => u.characterId!)),
    charactersRepository.findManyByAccountId(battle.accountId.toString()),
    battlesRepository.listByAccountId(battle.accountId.toString(), {
      status: BattleStatus.FINISHED,
      limit: SAME_NPC_XP.window + 1,
    }),
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

  const rewards: CharacterReward[] = []
  for (const unit of units) {
    const character = characters.find(
      (c) => c.id.toString() === unit.characterId
    )
    if (!character) continue

    const amount = xp.get(unit.ref) ?? 0
    const levelsGained = character.gainXp(amount)
    await charactersRepository.save(character)

    rewards.push({
      characterId: unit.characterId!,
      xp: amount,
      levelsGained,
      level: character.level,
    })
  }

  return rewards
}
