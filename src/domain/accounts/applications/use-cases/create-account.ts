import { Either, left, right } from '@/core/either'
import { ResourceAlreadyExistsError } from '@/core/errors/err/resource-already-exists-error'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { Character } from '@/domain/characters/entities/character'
import { InvalidCharacterError } from '@/domain/characters/errors/invalid-character-error'
import { startingRoster } from '@/domain/characters/services/starting-roster'
import { Account } from '../../entities/account'
import { InvalidAccountError } from '../../errors/invalid-account-error'
import { HashGenerator } from '../cryptography/hash-generator'
import { AccountsRepository } from '../repositories/accounts-repository'

interface CreateAccountUseCaseRequest {
  username: string
  displayName: string
  password: string
}

type CreateAccountUseCaseResponse = Either<
  InvalidAccountError | ResourceAlreadyExistsError | InvalidCharacterError,
  { account: Account; characters: Character[] }
>

/**
 * Cadastro (`data_model.md` 3.5): username + senha, já com os personagens iniciais (D133: um de cada modelo do
 * catálogo). A senha só é guardada como hash.
 */
export class CreateAccountUseCase {
  constructor(
    private accountsRepository: AccountsRepository,
    private charactersRepository: CharactersRepository,
    private catalogRepository: CatalogRepository,
    private hashGenerator: HashGenerator
  ) {}

  async execute({
    username,
    displayName,
    password,
  }: CreateAccountUseCaseRequest): Promise<CreateAccountUseCaseResponse> {
    const passwordError = Account.passwordError(password)
    if (passwordError) return left(passwordError)

    const created = Account.create({
      username,
      displayName,
      passwordHash: await this.hashGenerator.hash(password),
    })
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
