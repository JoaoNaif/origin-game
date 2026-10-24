import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { Squad } from '../../entities/squad'
import { InvalidSquadError } from '../../errors/invalid-squad-error'
import { SquadsRepository } from '../repositories/squads-repository'
import { loadSquadMembers, SquadMemberRequest } from './squad-members'

interface UpdateSquadFormationUseCaseRequest {
  squadId: string
  members: SquadMemberRequest[]
}

type UpdateSquadFormationUseCaseResponse = Either<
  ResourceNotFoundError | InvalidSquadError,
  { squad: Squad }
>

/** Troca personagens e células de uma vez, fora da batalha; se der erro, a formação anterior continua. */
export class UpdateSquadFormationUseCase {
  constructor(
    private charactersRepository: CharactersRepository,
    private squadsRepository: SquadsRepository
  ) {}

  async execute({
    squadId,
    members,
  }: UpdateSquadFormationUseCaseRequest): Promise<UpdateSquadFormationUseCaseResponse> {
    const squad = await this.squadsRepository.findById(squadId)
    if (!squad) return left(new ResourceNotFoundError('squad'))

    const loaded = await loadSquadMembers(this.charactersRepository, members)
    if (loaded.isLeft()) return left(loaded.value)

    const updated = squad.setFormation(loaded.value)
    if (updated.isLeft()) return left(updated.value)

    await this.squadsRepository.save(squad)

    return right({ squad })
  }
}
