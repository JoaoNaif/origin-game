import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Character } from '../../entities/character'
import { CharactersRepository } from '../repositories/characters-repository'

/** O personagem pelo id, só se for da conta (personagem de outra conta = `NotAllowedError`). */
export async function findOwnedCharacter(
  charactersRepository: CharactersRepository,
  characterId: string,
  accountId: string
): Promise<Either<ResourceNotFoundError | NotAllowedError, Character>> {
  const character = await charactersRepository.findById(characterId)
  if (!character) return left(new ResourceNotFoundError('personagem'))
  if (character.accountId.toString() !== accountId) {
    return left(new NotAllowedError())
  }

  return right(character)
}
