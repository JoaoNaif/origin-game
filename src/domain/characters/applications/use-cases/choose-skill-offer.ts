import { Either, left, right } from '@/core/either'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { Clock } from '@/core/gateways/clock'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { Character } from '../../entities/character'
import { InvalidCharacterError } from '../../errors/invalid-character-error'
import { InvalidSkillOfferError } from '../../errors/invalid-skill-offer-error'
import { CharactersRepository } from '../repositories/characters-repository'
import { SkillOffersRepository } from '../repositories/skill-offers-repository'
import { findOwnedCharacter } from '../services/owned-character'

interface ChooseSkillOfferUseCaseRequest {
  offerId: string
  accountId: string
  skillKey: string
}

type ChooseSkillOfferUseCaseResponse = Either<
  | ResourceNotFoundError
  | NotAllowedError
  | InvalidSkillOfferError
  | InvalidCharacterError,
  { character: Character }
>

/**
 * Escolhe 1 skill do bloco (D77): o personagem aprende e ela fica guardada (entra na build quando o jogador montar,
 * D43). As outras do bloco voltam ao pool.
 */
export class ChooseSkillOfferUseCase {
  constructor(
    private skillOffersRepository: SkillOffersRepository,
    private charactersRepository: CharactersRepository,
    private catalogRepository: CatalogRepository,
    private clock: Clock
  ) {}

  async execute({
    offerId,
    accountId,
    skillKey,
  }: ChooseSkillOfferUseCaseRequest): Promise<ChooseSkillOfferUseCaseResponse> {
    const offer = await this.skillOffersRepository.findById(offerId)
    if (!offer) return left(new ResourceNotFoundError('oferta de skill'))

    const found = await findOwnedCharacter(
      this.charactersRepository,
      offer.characterId.toString(),
      accountId
    )
    if (found.isLeft()) return left(found.value)

    const character = found.value
    const catalog = await this.catalogRepository.load()
    const skill = [...catalog.skills.values()].find((s) => s.key === skillKey)
    const template = catalog.templates.get(character.templateId.toValue())
    if (!skill || !template) {
      return left(new InvalidSkillOfferError('a skill não está no bloco'))
    }

    const chosen = offer.choose(skill.id, this.clock.now())
    if (chosen.isLeft()) return left(chosen.value)

    const learned = character.learnSkill(skill, template)
    if (learned.isLeft()) return left(learned.value)

    await this.charactersRepository.save(character)
    await this.skillOffersRepository.save(offer)

    return right({ character })
  }
}
