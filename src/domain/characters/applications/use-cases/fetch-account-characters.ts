import { Either, right } from '@/core/either'
import { GearRepository } from '@/domain/gear/applications/repositories/gear-repository'
import { Gear } from '@/domain/gear/entities/gear'
import { Character } from '../../entities/character'
import { CharactersRepository } from '../repositories/characters-repository'

interface FetchAccountCharactersUseCaseRequest {
  accountId: string
}

type FetchAccountCharactersUseCaseResponse = Either<
  never,
  { characters: Character[]; gear: Gear[] }
>

/** Os personagens da conta logada e o equipamento vivo no slot de cada um (D153). */
export class FetchAccountCharactersUseCase {
  constructor(
    private charactersRepository: CharactersRepository,
    private gearRepository: GearRepository
  ) {}

  async execute({
    accountId,
  }: FetchAccountCharactersUseCaseRequest): Promise<FetchAccountCharactersUseCaseResponse> {
    const characters =
      await this.charactersRepository.findManyByAccountId(accountId)
    const gear = await this.gearRepository.findEquippedByCharacterIds(
      characters.map((c) => c.id.toString())
    )

    return right({ characters, gear })
  }
}
