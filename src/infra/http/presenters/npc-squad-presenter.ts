import { NpcSquad } from '@/domain/squads/entities/npc-squad'

/**
 * Adversário do PvE como aparece na escolha. Sem os personagens, a formação e as skills: a formação do rival só é
 * revelada quando a batalha começa, e as skills nem nela (`pvp_brief.md` 3).
 */
export class NpcSquadPresenter {
  static toHTTP(squad: NpcSquad) {
    return {
      key: squad.key,
      name: squad.name,
      description: squad.description,
      profile: squad.profile,
      difficulty: squad.difficulty,
      level: Math.max(...squad.members.map((m) => m.level)),
    }
  }
}
