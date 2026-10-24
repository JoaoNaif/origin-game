import { Either, left, right } from '@/core/either'
import { ResourceAlreadyExistsError } from '@/core/errors/err/resource-already-exists-error'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { Character } from '@/domain/characters/entities/character'
import { InvalidCharacterError } from '@/domain/characters/errors/invalid-character-error'
import { startingRoster } from '@/domain/characters/services/starting-roster'
import { Account } from '../../entities/account'
import { InvalidAccountError } from '../../errors/invalid-account-error'
import { AccountsRepository } from '../repositories/accounts-repository'

interface CreateAccountUseCaseRequest {
  username: string
  displayName: string
}

type CreateAccountUseCaseResponse = Either<
  InvalidAccountError | ResourceAlreadyExistsError | InvalidCharacterError,
  { account: Account; characters: Character[] }
>

/**
 * Cria a conta do jogador (sem login no MVP: a autenticação entra depois, `data_model.md` 3.5) já com os personagens
 * iniciais (D133: um de cada modelo do catálogo).
 */
export class CreateAccountUseCase {
  constructor(
    private accountsRepository: AccountsRepository,
    private charactersRepository: CharactersRepository,
    private catalogRepository: CatalogRepository
  ) {}

  async execute({
    username,
    displayName,
  }: CreateAccountUseCaseRequest): Promise<CreateAccountUseCaseResponse> {
    const created = Account.create({ username, displayName })
    if (created.isLeft()) return left(created.value)

    const account = created.value
    const existing = await this.accountsRepository.findByUsername(
      account.username
    )
    if (existing) {
      return left(new ResourceAlreadyExistsError(`conta ${account.username}`))
    }

    const catalog = await this.catalogRepository.load()
    const roster = startingRoster(account, catalog)
    if (roster.isLeft()) return left(roster.value)

    await this.accountsRepository.create(account)
    await this.charactersRepository.createMany(roster.value)

    return right({ account, characters: roster.value })
  }
}
