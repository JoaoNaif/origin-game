import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Character } from '../../entities/character'
import { CharactersRepository } from '../repositories/characters-repository'
import { findOwnedCharacter } from '../services/owned-character'

interface GetCharacterUseCaseRequest {
  characterId: string
  accountId: string
}

type GetCharacterUseCaseResponse = Either<
  ResourceNotFoundError | NotAllowedError,
  { character: Character }
>

export class GetCharacterUseCase {
  constructor(private charactersRepository: CharactersRepository) {}

  async execute({
    characterId,
    accountId,
  }: GetCharacterUseCaseRequest): Promise<GetCharacterUseCaseResponse> {
    const found = await findOwnedCharacter(
      this.charactersRepository,
      characterId,
      accountId
    )
    if (found.isLeft()) return left(found.value)

    return right({ character: found.value })
  }
}
