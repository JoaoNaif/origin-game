import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { GridPosition } from '../../value-objects/grid-position'
import { SquadMemberInput } from '../../entities/squad'

/** Membro como chega do cliente: o id do personagem e a célula. */
export interface SquadMemberRequest extends GridPosition {
  characterId: string
}

/** Carrega os personagens pedidos (regras de dono, quantidade e célula ficam no `Squad`). */
export async function loadSquadMembers(
  charactersRepository: CharactersRepository,
  members: SquadMemberRequest[]
): Promise<Either<ResourceNotFoundError, SquadMemberInput[]>> {
  const characters = await charactersRepository.findManyByIds(
    members.map((m) => m.characterId)
  )
  const inputs: SquadMemberInput[] = []

  for (const { characterId, row, column } of members) {
    const character = characters.find((c) => c.id.toString() === characterId)
    if (!character) return left(new ResourceNotFoundError('personagem'))

    inputs.push({ character, row, column })
  }

  return right(inputs)
}
