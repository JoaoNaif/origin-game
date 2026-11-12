import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { findOwnedCharacter } from '@/domain/characters/applications/services/owned-character'
import { Character } from '@/domain/characters/entities/character'
import { Beast } from '../../entities/beast'
import { InvalidBeastError } from '../../errors/invalid-beast-error'
import { contractError } from '../../services/beast-rules'
import { BeastsRepository } from '../repositories/beasts-repository'
import { findOwnedBeast } from '../services/owned-beast'

interface ContractBeastUseCaseRequest {
  accountId: string
  beastId: string
  characterId: string
  /** Slot da build (1 a 4) que a invocação vai ocupar. */
  slot: number
}

type ContractBeastUseCaseResponse = Either<
  ResourceNotFoundError | NotAllowedError | InvalidBeastError,
  { beast: Beast; character: Character }
>

/**
 * Firma o contrato da besta com um personagem da conta (D64, D154): a invocação passa a ocupar um slot da build. Uma
 * vez só: desfazer o contrato perde a besta.
 */
export class ContractBeastUseCase {
  constructor(
    private beastsRepository: BeastsRepository,
    private charactersRepository: CharactersRepository,
    private catalogRepository: CatalogRepository
  ) {}

  async execute({
    accountId,
    beastId,
    characterId,
    slot,
  }: ContractBeastUseCaseRequest): Promise<ContractBeastUseCaseResponse> {
    const beast = await findOwnedBeast(
      this.beastsRepository,
      beastId,
      accountId
    )
    if (beast.isLeft()) return left(beast.value)

    const character = await findOwnedCharacter(
      this.charactersRepository,
      characterId,
      accountId
    )
    if (character.isLeft()) return left(character.value)

    const [catalog, current] = await Promise.all([
      this.catalogRepository.load(),
      this.beastsRepository.findManyByCharacterIds([characterId]),
    ])
    const template = catalog.beastTemplates.get(
      beast.value.templateId.toValue()
    )
    if (!template) return left(new ResourceNotFoundError('modelo da besta'))

    const error = contractError({
      template,
      character: character.value,
      characterTemplate: catalog.templates.get(
        character.value.templateId.toValue()
      )!,
      slot,
      others: current
        .filter((b) => !b.equals(beast.value) && b.slot !== null)
        .map((b) => ({
          template: catalog.beastTemplates.get(b.templateId.toValue())!,
          slot: b.slot!,
        })),
    })
    if (error) return left(new InvalidBeastError(error))

    const contracted = beast.value.contractWith(
      character.value.accountId,
      character.value.id,
      slot
    )
    if (contracted.isLeft()) return left(contracted.value)

    await this.beastsRepository.save(beast.value)

    return right({ beast: beast.value, character: character.value })
  }
}
