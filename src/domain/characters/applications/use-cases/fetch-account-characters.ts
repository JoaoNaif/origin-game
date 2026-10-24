import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { Account } from '@/domain/accounts/entities/account'
import { Character } from '../../entities/character'
import { CharactersRepository } from '../repositories/characters-repository'

interface FetchAccountCharactersUseCaseRequest {
  username: string
}

type FetchAccountCharactersUseCaseResponse = Either<
  ResourceNotFoundError,
  { characters: Character[] }
>

/** Os personagens de uma conta (pelo username, normalizado como no cadastro). */
export class FetchAccountCharactersUseCase {
  constructor(
    private accountsRepository: AccountsRepository,
    private charactersRepository: CharactersRepository
  ) {}

  async execute({
    username,
  }: FetchAccountCharactersUseCaseRequest): Promise<FetchAccountCharactersUseCaseResponse> {
    const account = await this.accountsRepository.findByUsername(
      Account.normalizeUsername(username)
    )
    if (!account) return left(new ResourceNotFoundError('conta'))

    const characters = await this.charactersRepository.findManyByAccountId(
      account.id.toString()
    )

    return right({ characters })
  }
}
