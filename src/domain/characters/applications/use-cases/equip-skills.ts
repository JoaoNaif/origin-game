import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Character } from '../../entities/character'
import { InvalidCharacterError } from '../../errors/invalid-character-error'
import { CharactersRepository } from '../repositories/characters-repository'
import { findOwnedCharacter } from '../services/owned-character'

interface EquipSkillsUseCaseRequest {
  characterId: string
  accountId: string
  /** As 4 skills da build, na ordem dos slots, pela `key`. */
  skillKeys: string[]
}

type EquipSkillsUseCaseResponse = Either<
  ResourceNotFoundError | NotAllowedError | InvalidCharacterError,
  { character: Character }
>

/** Monta a build de batalha (D43) com skills que o personagem já aprendeu. */
export class EquipSkillsUseCase {
  constructor(private charactersRepository: CharactersRepository) {}

  async execute({
    characterId,
    accountId,
    skillKeys,
  }: EquipSkillsUseCaseRequest): Promise<EquipSkillsUseCaseResponse> {
    const found = await findOwnedCharacter(
      this.charactersRepository,
      characterId,
      accountId
    )
    if (found.isLeft()) return left(found.value)

    const character = found.value
    const skillIds = []
    for (const key of skillKeys) {
      const learned = character.skills.find((s) => s.skill.key === key)
      if (!learned) {
        return left(new InvalidCharacterError(`skill não aprendida: ${key}`))
      }
      skillIds.push(learned.skill.id)
    }

    const equipped = character.equipSkills(skillIds)
    if (equipped.isLeft()) return left(equipped.value)

    await this.charactersRepository.save(character)

    return right({ character })
  }
}
