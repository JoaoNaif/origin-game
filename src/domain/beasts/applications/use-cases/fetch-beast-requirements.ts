import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { Character } from '@/domain/characters/entities/character'
import { GearBondResult } from '@/domain/gear/services/gear-bond'
import { Beast } from '../../entities/beast'
import { masterRequirements } from '../../services/beast-rules'
import { BeastsRepository } from '../repositories/beasts-repository'
import { findOwnedBeast } from '../services/owned-beast'

interface FetchBeastRequirementsUseCaseRequest {
  accountId: string
  beastId: string
}

type FetchBeastRequirementsUseCaseResponse = Either<
  ResourceNotFoundError | NotAllowedError,
  {
    beast: Beast
    /** Vazio fora do contrato Mestre (Dominância e Igualdade não têm requisitos). */
    requirements: { character: Character; result: GearBondResult }[]
  }
>

/** Os requisitos do contrato Mestre com cada personagem da conta (para escolher com quem firmar, 9.5). */
export class FetchBeastRequirementsUseCase {
  constructor(
    private beastsRepository: BeastsRepository,
    private charactersRepository: CharactersRepository,
    private catalogRepository: CatalogRepository
  ) {}

  async execute({
    accountId,
    beastId,
  }: FetchBeastRequirementsUseCaseRequest): Promise<FetchBeastRequirementsUseCaseResponse> {
    const beast = await findOwnedBeast(
      this.beastsRepository,
      beastId,
      accountId
    )
    if (beast.isLeft()) return left(beast.value)

    const catalog = await this.catalogRepository.load()
    const template = catalog.beastTemplates.get(
      beast.value.templateId.toValue()
    )
    if (!template) return left(new ResourceNotFoundError('modelo da besta'))
    if (template.contract !== 'MASTER') {
      return right({ beast: beast.value, requirements: [] })
    }

    const characters =
      await this.charactersRepository.findManyByAccountId(accountId)

    return right({
      beast: beast.value,
      requirements: characters.map((character) => ({
        character,
        result: masterRequirements(
          template,
          character,
          catalog.templates.get(character.templateId.toValue())!
        ),
      })),
    })
  }
}
