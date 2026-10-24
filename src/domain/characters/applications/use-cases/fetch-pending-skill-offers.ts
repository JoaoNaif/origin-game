import { Either, right } from '@/core/either'
import { SkillOffer } from '../../entities/skill-offer'
import { CharactersRepository } from '../repositories/characters-repository'
import { SkillOffersRepository } from '../repositories/skill-offers-repository'

interface FetchPendingSkillOffersUseCaseRequest {
  accountId: string
}

type FetchPendingSkillOffersUseCaseResponse = Either<
  never,
  { offers: SkillOffer[] }
>

/** Os blocos de skill esperando escolha nos personagens da conta logada (a fila, D135). */
export class FetchPendingSkillOffersUseCase {
  constructor(
    private charactersRepository: CharactersRepository,
    private skillOffersRepository: SkillOffersRepository
  ) {}

  async execute({
    accountId,
  }: FetchPendingSkillOffersUseCaseRequest): Promise<FetchPendingSkillOffersUseCaseResponse> {
    const characters =
      await this.charactersRepository.findManyByAccountId(accountId)
    const offers = await this.skillOffersRepository.findPendingByCharacterIds(
      characters.map((c) => c.id.toString())
    )

    return right({ offers })
  }
}
