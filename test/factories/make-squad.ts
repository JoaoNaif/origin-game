import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { CreateSquadInput, Squad } from '@/domain/squads/entities/squad'

export function makeSquad(input: CreateSquadInput, id?: UniqueEntityId): Squad {
  const result = Squad.create(input, id)

  if (result.isLeft()) throw result.value

  return result.value
}
