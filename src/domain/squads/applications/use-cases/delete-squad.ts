import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { SquadsRepository } from '../repositories/squads-repository'

interface DeleteSquadUseCaseRequest {
  squadId: string
}

type DeleteSquadUseCaseResponse = Either<ResourceNotFoundError, null>

/** Apaga a formação (as batalhas já jogadas com ela ficam: guardam a foto, não o squad). */
export class DeleteSquadUseCase {
  constructor(private squadsRepository: SquadsRepository) {}

  async execute({
    squadId,
  }: DeleteSquadUseCaseRequest): Promise<DeleteSquadUseCaseResponse> {
    const squad = await this.squadsRepository.findById(squadId)
    if (!squad) return left(new ResourceNotFoundError('squad'))

    await this.squadsRepository.delete(squad)

    return right(null)
  }
}
