import { Either, right } from '@/core/either'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { Character } from '@/domain/characters/entities/character'
import { WalletsRepository } from '@/domain/economy/applications/repositories/wallets-repository'
import { Gear } from '../../entities/gear'
import { GearRepository } from '../repositories/gear-repository'

interface FetchAccountGearUseCaseRequest {
  accountId: string
}

type FetchAccountGearUseCaseResponse = Either<
  never,
  {
    gear: Gear[]
    /** Quem está usando cada equipamento equipado (para o elo). */
    holders: Character[]
    slots: number
    nextExpansionPrice: number | null
  }
>

/** O inventário da conta (D100): os equipamentos, quem usa cada um, os espaços e o preço da próxima compra. */
export class FetchAccountGearUseCase {
  constructor(
    private gearRepository: GearRepository,
    private charactersRepository: CharactersRepository,
    private walletsRepository: WalletsRepository
  ) {}

  async execute({
    accountId,
  }: FetchAccountGearUseCaseRequest): Promise<FetchAccountGearUseCaseResponse> {
    const [gear, wallet] = await Promise.all([
      this.gearRepository.findManyByAccountId(accountId),
      this.walletsRepository.findByAccountId(accountId),
    ])
    const holderIds = gear
      .filter((g) => g.characterId)
      .map((g) => g.characterId!.toString())
    const holders =
      holderIds.length > 0
        ? await this.charactersRepository.findManyByIds(holderIds)
        : []

    return right({
      gear,
      holders,
      slots: wallet.inventorySlots,
      nextExpansionPrice: wallet.nextInventoryExpansionPrice,
    })
  }
}
