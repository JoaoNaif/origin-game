import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { Character } from '@/domain/characters/entities/character'
import { Gear } from '../../entities/gear'
import { characterGearBond, GearBondResult } from '../../services/gear-bond'
import { GearRepository } from '../repositories/gear-repository'
import { findOwnedGear } from '../services/owned-gear'

interface FetchGearBondsUseCaseRequest {
  accountId: string
  gearId: string
}

type FetchGearBondsUseCaseResponse = Either<
  ResourceNotFoundError | NotAllowedError,
  { gear: Gear; bonds: { character: Character; bond: GearBondResult }[] }
>

/** O elo do equipamento com cada personagem da conta (para escolher quem usa, `living_gear_brief.md` 4.1). */
export class FetchGearBondsUseCase {
  constructor(
    private gearRepository: GearRepository,
    private charactersRepository: CharactersRepository,
    private catalogRepository: CatalogRepository
  ) {}

  async execute({
    accountId,
    gearId,
  }: FetchGearBondsUseCaseRequest): Promise<FetchGearBondsUseCaseResponse> {
    const gear = await findOwnedGear(this.gearRepository, gearId, accountId)
    if (gear.isLeft()) return left(gear.value)

    const [catalog, characters] = await Promise.all([
      this.catalogRepository.load(),
      this.charactersRepository.findManyByAccountId(accountId),
    ])
    const template = catalog.gearTemplates.get(gear.value.templateId.toValue())
    if (!template) {
      return left(new ResourceNotFoundError('modelo do equipamento'))
    }

    return right({
      gear: gear.value,
      bonds: characters.map((character) => ({
        character,
        bond: characterGearBond(
          template,
          character,
          catalog.templates.get(character.templateId.toValue())!
        ),
      })),
    })
  }
}
