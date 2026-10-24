import { Squad } from '@/domain/squads/entities/squad'

export class SquadPresenter {
  static toHTTP(squad: Squad) {
    return {
      id: squad.id.toString(),
      name: squad.name,
      members: squad.members.map((m) => ({
        characterId: m.characterId.toString(),
        row: m.row,
        column: m.column,
      })),
    }
  }
}
