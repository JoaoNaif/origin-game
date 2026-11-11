import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
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
  { character: Character; gear: Gear | null }
>

/** O personagem da conta e o equipamento vivo no slot dele (D153). */
export class GetCharacterUseCase {
  constructor(
    private charactersRepository: CharactersRepository,
    private gearRepository: GearRepository
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

    const [gear] = await this.gearRepository.findEquippedByCharacterIds([
      characterId,
    ])

    return right({ character: found.value, gear: gear ?? null })
  }
}
