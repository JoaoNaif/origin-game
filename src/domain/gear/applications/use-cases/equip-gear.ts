import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { findOwnedCharacter } from '@/domain/characters/applications/services/owned-character'
import { Character } from '@/domain/characters/entities/character'
import { Gear } from '../../entities/gear'
import { InvalidGearError } from '../../errors/invalid-gear-error'
import { GearRepository } from '../repositories/gear-repository'
import { findOwnedGear } from '../services/owned-gear'

interface EquipGearUseCaseRequest {
  accountId: string
  gearId: string
  characterId: string
}

type EquipGearUseCaseResponse = Either<
  ResourceNotFoundError | NotAllowedError | InvalidGearError,
  { gear: Gear; character: Character; unequipped: Gear | null }
>

/**
 * Põe o equipamento no slot do personagem (D94: um slot só, arma ou armadura). O que estava no slot volta para o
 * inventário; se o equipamento estava em outro personagem, sai de lá. Qualquer elo vale (sem elo é má troca, não erro).
 */
export class EquipGearUseCase {
  constructor(
    private gearRepository: GearRepository,
    private charactersRepository: CharactersRepository
  ) {}

  async execute({
    accountId,
    gearId,
    characterId,
  }: EquipGearUseCaseRequest): Promise<EquipGearUseCaseResponse> {
    const gear = await findOwnedGear(this.gearRepository, gearId, accountId)
    if (gear.isLeft()) return left(gear.value)

    const character = await findOwnedCharacter(
      this.charactersRepository,
      characterId,
      accountId
    )
    if (character.isLeft()) return left(character.value)

    if (gear.value.characterId?.equals(character.value.id)) {
      return right({
        gear: gear.value,
        character: character.value,
        unequipped: null,
      })
    }

    const [current] = await this.gearRepository.findEquippedByCharacterIds([
      characterId,
    ])
    const unequipped = current && !current.equals(gear.value) ? current : null
    unequipped?.unequip()

    const equipped = gear.value.equipOn(
      character.value.accountId,
      character.value.id
    )
    if (equipped.isLeft()) return left(equipped.value)

    await this.gearRepository.saveMany(
      unequipped ? [unequipped, gear.value] : [gear.value]
    )

    return right({ gear: gear.value, character: character.value, unequipped })
  }
}
