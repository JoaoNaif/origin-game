import { Either, right } from '@/core/either'
import { BeastsRepository } from '@/domain/beasts/applications/repositories/beasts-repository'
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
    /** Espaços ocupados: equipamentos e bestas (D100). */
    used: number
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
    private walletsRepository: WalletsRepository,
    private beastsRepository: BeastsRepository
  ) {}

  async execute({
    accountId,
  }: FetchAccountGearUseCaseRequest): Promise<FetchAccountGearUseCaseResponse> {
    const [gear, wallet, beasts] = await Promise.all([
      this.gearRepository.findManyByAccountId(accountId),
      this.walletsRepository.findByAccountId(accountId),
      this.beastsRepository.countByAccountId(accountId),
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
      used: gear.length + beasts,
      holders,
      slots: wallet.inventorySlots,
      nextExpansionPrice: wallet.nextInventoryExpansionPrice,
    })
  }
}
