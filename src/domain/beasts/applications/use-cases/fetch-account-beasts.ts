import { Either, right } from '@/core/either'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { Character } from '@/domain/characters/entities/character'
import { Beast } from '../../entities/beast'
import { BeastsRepository } from '../repositories/beasts-repository'

interface FetchAccountBeastsUseCaseRequest {
  accountId: string
}

type FetchAccountBeastsUseCaseResponse = Either<
  never,
  {
    beasts: Beast[]
    /** Os personagens com contrato (para os requisitos do Mestre). */
    holders: Character[]
  }
>

/** As bestas da conta, com e sem contrato. */
export class FetchAccountBeastsUseCase {
  constructor(
    private beastsRepository: BeastsRepository,
    private charactersRepository: CharactersRepository
  ) {}

  async execute({
    accountId,
  }: FetchAccountBeastsUseCaseRequest): Promise<FetchAccountBeastsUseCaseResponse> {
    const beasts = await this.beastsRepository.findManyByAccountId(accountId)
    const holderIds = beasts
      .filter((b) => b.characterId)
      .map((b) => b.characterId!.toString())
    const holders =
      holderIds.length > 0
        ? await this.charactersRepository.findManyByIds(holderIds)
        : []

    return right({ beasts, holders })
  }
}
