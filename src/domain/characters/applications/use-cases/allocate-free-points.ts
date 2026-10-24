import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Character } from '../../entities/character'
import { InvalidCharacterError } from '../../errors/invalid-character-error'
import { StatBlock } from '../../value-objects/stat-block'
import { CharactersRepository } from '../repositories/characters-repository'
import { findOwnedCharacter } from '../services/owned-character'

interface AllocateFreePointsUseCaseRequest {
  characterId: string
  accountId: string
  /** A distribuição inteira (troca a anterior de uma vez, D48). */
  freePoints: StatBlock
}

type AllocateFreePointsUseCaseResponse = Either<
  ResourceNotFoundError | NotAllowedError | InvalidCharacterError,
  { character: Character }
>

/** Redistribui os pontos livres (grátis fora da batalha, D48, D91). */
export class AllocateFreePointsUseCase {
  constructor(
    private charactersRepository: CharactersRepository,
    private catalogRepository: CatalogRepository
  ) {}

  async execute({
    characterId,
    accountId,
    freePoints,
  }: AllocateFreePointsUseCaseRequest): Promise<AllocateFreePointsUseCaseResponse> {
    const found = await findOwnedCharacter(
      this.charactersRepository,
      characterId,
      accountId
    )
    if (found.isLeft()) return left(found.value)

    const character = found.value
    const catalog = await this.catalogRepository.load()
    const template = catalog.templates.get(character.templateId.toValue())
    if (!template) return left(new ResourceNotFoundError('modelo'))

    const allocated = character.allocateFreePoints(freePoints, template)
    if (allocated.isLeft()) return left(allocated.value)

    await this.charactersRepository.save(character)

    return right({ character })
  }
}
