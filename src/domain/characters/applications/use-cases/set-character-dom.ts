import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Character } from '../../entities/character'
import { InvalidCharacterError } from '../../errors/invalid-character-error'
import { DomPillars } from '../../value-objects/dom-state'
import { CharactersRepository } from '../repositories/characters-repository'

interface SetCharacterDomUseCaseRequest {
  characterId: string
  /** Nível de cada pilar; pilar ausente = sem DOM nele. */
  pillars: DomPillars
}

type SetCharacterDomUseCaseResponse = Either<
  ResourceNotFoundError | InvalidCharacterError,
  { character: Character }
>

/**
 * Admin define os níveis do DOM de um personagem (D152), para testar sem farmar feitos. A janela de feitos fica como
 * está; sem feitos, o pilar volta a cair 1 nível a cada 25 de peso.
 */
export class SetCharacterDomUseCase {
  constructor(private charactersRepository: CharactersRepository) {}

  async execute({
    characterId,
    pillars,
  }: SetCharacterDomUseCaseRequest): Promise<SetCharacterDomUseCaseResponse> {
    const character = await this.charactersRepository.findById(characterId)
    if (!character) return left(new ResourceNotFoundError('personagem'))

    const set = character.setDomPillars(pillars)
    if (set.isLeft()) return left(set.value)

    await this.charactersRepository.save(character)

    return right({ character })
  }
}
