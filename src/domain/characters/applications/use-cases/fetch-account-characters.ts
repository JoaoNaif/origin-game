import { Either, right } from '@/core/either'
import { BeastsRepository } from '@/domain/beasts/applications/repositories/beasts-repository'
import { Beast } from '@/domain/beasts/entities/beast'
import { GearRepository } from '@/domain/gear/applications/repositories/gear-repository'
import { Gear } from '@/domain/gear/entities/gear'
import { Character } from '../../entities/character'
import { CharactersRepository } from '../repositories/characters-repository'

interface FetchAccountCharactersUseCaseRequest {
  accountId: string
}

type FetchAccountCharactersUseCaseResponse = Either<
  never,
  { characters: Character[]; gear: Gear[]; beasts: Beast[] }
>

/** Os personagens da conta logada e o equipamento vivo no slot de cada um (D153). */
export class FetchAccountCharactersUseCase {
  constructor(
    private charactersRepository: CharactersRepository,
    private gearRepository: GearRepository,
    private beastsRepository: BeastsRepository
  ) {}

  async execute({
    accountId,
  }: FetchAccountCharactersUseCaseRequest): Promise<FetchAccountCharactersUseCaseResponse> {
    const characters =
      await this.charactersRepository.findManyByAccountId(accountId)
    const ids = characters.map((c) => c.id.toString())
    const [gear, beasts] = await Promise.all([
      this.gearRepository.findEquippedByCharacterIds(ids),
      this.beastsRepository.findManyByCharacterIds(ids),
    ])

    return right({ characters, gear, beasts })
  }
}
