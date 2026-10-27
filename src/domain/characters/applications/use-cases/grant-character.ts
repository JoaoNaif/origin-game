import { Either, left, right } from '@/core/either'
import { ResourceAlreadyExistsError } from '@/core/errors/err/resource-already-exists-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { Account } from '@/domain/accounts/entities/account'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { templateKit } from '@/domain/catalog/services/template-skills'
import { Character } from '../../entities/character'
import { InvalidCharacterError } from '../../errors/invalid-character-error'
import { CharactersRepository } from '../repositories/characters-repository'

interface GrantCharacterUseCaseRequest {
  username: string
  templateKey: string
}

type GrantCharacterUseCaseResponse = Either<
  ResourceNotFoundError | ResourceAlreadyExistsError | InvalidCharacterError,
  { character: Character }
>

/**
 * Admin dá um personagem a uma conta (ex.: um modelo criado depois dela, que a conta não recebeu no cadastro, D133).
 * Entra como no cadastro: nível 0, kit básico na build e traço de família. Um por modelo na conta.
 */
export class GrantCharacterUseCase {
  constructor(
    private accountsRepository: AccountsRepository,
    private charactersRepository: CharactersRepository,
    private catalogRepository: CatalogRepository
  ) {}

  async execute({
    username,
    templateKey,
  }: GrantCharacterUseCaseRequest): Promise<GrantCharacterUseCaseResponse> {
    const account = await this.accountsRepository.findByUsername(
      Account.normalizeUsername(username)
    )
    if (!account) return left(new ResourceNotFoundError('conta'))

    const catalog = await this.catalogRepository.load()
    const template = [...catalog.templates.values()].find(
      (t) => t.key === templateKey
    )
    if (!template) return left(new ResourceNotFoundError('modelo'))

    const owned = await this.charactersRepository.findManyByAccountId(
      account.id.toString()
    )
    if (owned.some((c) => c.templateId.equals(template.id))) {
      return left(new ResourceAlreadyExistsError(`${templateKey} na conta`))
    }

    const created = Character.create({
      account,
      template,
      familyTrait: template.familyTraitId
        ? catalog.traits.get(template.familyTraitId.toValue())
        : null,
      kitSkills: templateKit(catalog, template),
    })
    if (created.isLeft()) return left(created.value)

    await this.charactersRepository.createMany([created.value])

    return right({ character: created.value })
  }
}
