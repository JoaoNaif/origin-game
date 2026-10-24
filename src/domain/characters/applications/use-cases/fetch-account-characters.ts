import { Either, right } from '@/core/either'
import { Character } from '../../entities/character'
import { CharactersRepository } from '../repositories/characters-repository'

interface FetchAccountCharactersUseCaseRequest {
  accountId: string
}

type FetchAccountCharactersUseCaseResponse = Either<
  never,
  { characters: Character[] }
>

/** Os personagens da conta logada. */
export class FetchAccountCharactersUseCase {
  constructor(private charactersRepository: CharactersRepository) {}

  async execute({
    accountId,
  }: FetchAccountCharactersUseCaseRequest): Promise<FetchAccountCharactersUseCaseResponse> {
    const characters =
      await this.charactersRepository.findManyByAccountId(accountId)

    return right({ characters })
  }
}
