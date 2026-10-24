import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Character } from '../../entities/character'
import { InvalidCharacterError } from '../../errors/invalid-character-error'
import { StatBlock } from '../../value-objects/stat-block'
import { CharactersRepository } from '../repositories/characters-repository'

interface AllocateFreePointsUseCaseRequest {
  characterId: string
  /** A distribuição inteira (troca a anterior de uma vez, D48). */
  freePoints: StatBlock
}

type AllocateFreePointsUseCaseResponse = Either<
  ResourceNotFoundError | InvalidCharacterError,
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
    freePoints,
  }: AllocateFreePointsUseCaseRequest): Promise<AllocateFreePointsUseCaseResponse> {
    const character = await this.charactersRepository.findById(characterId)
    if (!character) return left(new ResourceNotFoundError('personagem'))

    const catalog = await this.catalogRepository.load()
    const template = catalog.templates.get(character.templateId.toValue())
    if (!template) return left(new ResourceNotFoundError('modelo'))

    const allocated = character.allocateFreePoints(freePoints, template)
    if (allocated.isLeft()) return left(allocated.value)

    await this.charactersRepository.save(character)

    return right({ character })
  }
}
