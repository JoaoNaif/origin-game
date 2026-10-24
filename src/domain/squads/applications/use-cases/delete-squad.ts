import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { SquadsRepository } from '../repositories/squads-repository'
import { findOwnedSquad } from '../services/owned-squad'

interface DeleteSquadUseCaseRequest {
  squadId: string
  accountId: string
}

type DeleteSquadUseCaseResponse = Either<
  ResourceNotFoundError | NotAllowedError,
  null
>

/** Apaga a formação (as batalhas já jogadas com ela ficam: guardam a foto, não o squad). */
export class DeleteSquadUseCase {
  constructor(private squadsRepository: SquadsRepository) {}

  async execute({
    squadId,
    accountId,
  }: DeleteSquadUseCaseRequest): Promise<DeleteSquadUseCaseResponse> {
    const found = await findOwnedSquad(
      this.squadsRepository,
      squadId,
      accountId
    )
    if (found.isLeft()) return left(found.value)

    await this.squadsRepository.delete(found.value)

    return right(null)
  }
}
