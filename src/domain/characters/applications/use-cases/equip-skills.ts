import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Character } from '../../entities/character'
import { InvalidCharacterError } from '../../errors/invalid-character-error'
import { CharactersRepository } from '../repositories/characters-repository'

interface EquipSkillsUseCaseRequest {
  characterId: string
  /** As 4 skills da build, na ordem dos slots, pela `key`. */
  skillKeys: string[]
}

type EquipSkillsUseCaseResponse = Either<
  ResourceNotFoundError | InvalidCharacterError,
  { character: Character }
>

/** Monta a build de batalha (D43) com skills que o personagem já aprendeu. */
export class EquipSkillsUseCase {
  constructor(private charactersRepository: CharactersRepository) {}

  async execute({
    characterId,
    skillKeys,
  }: EquipSkillsUseCaseRequest): Promise<EquipSkillsUseCaseResponse> {
    const character = await this.charactersRepository.findById(characterId)
    if (!character) return left(new ResourceNotFoundError('personagem'))

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
