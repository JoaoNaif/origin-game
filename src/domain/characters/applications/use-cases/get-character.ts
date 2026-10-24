import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Character } from '../../entities/character'
import { CharactersRepository } from '../repositories/characters-repository'

interface GetCharacterUseCaseRequest {
  characterId: string
}

type GetCharacterUseCaseResponse = Either<
  ResourceNotFoundError,
  { character: Character }
>

export class GetCharacterUseCase {
  constructor(private charactersRepository: CharactersRepository) {}

  async execute({
    characterId,
  }: GetCharacterUseCaseRequest): Promise<GetCharacterUseCaseResponse> {
    const character = await this.charactersRepository.findById(characterId)
    if (!character) return left(new ResourceNotFoundError('personagem'))

    return right({ character })
  }
}
