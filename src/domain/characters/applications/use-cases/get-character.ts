import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { BeastsRepository } from '@/domain/beasts/applications/repositories/beasts-repository'
import { Beast } from '@/domain/beasts/entities/beast'
import { GearRepository } from '@/domain/gear/applications/repositories/gear-repository'
import { Gear } from '@/domain/gear/entities/gear'
import { Character } from '../../entities/character'
import { CharactersRepository } from '../repositories/characters-repository'
import { findOwnedCharacter } from '../services/owned-character'

interface GetCharacterUseCaseRequest {
  characterId: string
  accountId: string
}

type GetCharacterUseCaseResponse = Either<
  ResourceNotFoundError | NotAllowedError,
  { character: Character; gear: Gear | null; beasts: Beast[] }
>

/** O personagem da conta, o equipamento vivo no slot dele (D153) e as bestas com contrato (D154). */
export class GetCharacterUseCase {
  constructor(
    private charactersRepository: CharactersRepository,
    private gearRepository: GearRepository,
    private beastsRepository: BeastsRepository
  ) {}

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

    const [[gear], beasts] = await Promise.all([
      this.gearRepository.findEquippedByCharacterIds([characterId]),
      this.beastsRepository.findManyByCharacterIds([characterId]),
    ])

    return right({ character: found.value, gear: gear ?? null, beasts })
  }
}
