import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Gear } from '../../entities/gear'
import { GearRepository } from '../repositories/gear-repository'
import { findOwnedGear } from '../services/owned-gear'

interface UnequipGearUseCaseRequest {
  accountId: string
  gearId: string
}

type UnequipGearUseCaseResponse = Either<
  ResourceNotFoundError | NotAllowedError,
  { gear: Gear }
>

/** Tira o equipamento do personagem: ele volta para o inventário. Já guardado, não muda nada. */
export class UnequipGearUseCase {
  constructor(private gearRepository: GearRepository) {}

  async execute({
    accountId,
    gearId,
  }: UnequipGearUseCaseRequest): Promise<UnequipGearUseCaseResponse> {
    const gear = await findOwnedGear(this.gearRepository, gearId, accountId)
    if (gear.isLeft()) return left(gear.value)

    if (gear.value.isEquipped) {
      gear.value.unequip()
      await this.gearRepository.saveMany([gear.value])
    }

    return right({ gear: gear.value })
  }
}
