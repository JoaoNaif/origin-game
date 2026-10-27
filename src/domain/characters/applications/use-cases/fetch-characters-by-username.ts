import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { Account } from '@/domain/accounts/entities/account'
import { Character } from '../../entities/character'
import { CharactersRepository } from '../repositories/characters-repository'

interface FetchCharactersByUsernameUseCaseRequest {
  username: string
}

type FetchCharactersByUsernameUseCaseResponse = Either<
  ResourceNotFoundError,
  { account: Account; characters: Character[] }
>

/** Admin: os personagens de qualquer conta, pelo username (normalizado como no cadastro). */
export class FetchCharactersByUsernameUseCase {
  constructor(
    private accountsRepository: AccountsRepository,
    private charactersRepository: CharactersRepository
  ) {}

  async execute({
    username,
  }: FetchCharactersByUsernameUseCaseRequest): Promise<FetchCharactersByUsernameUseCaseResponse> {
    const account = await this.accountsRepository.findByUsername(
      Account.normalizeUsername(username)
    )
    if (!account) return left(new ResourceNotFoundError('conta'))

    const characters = await this.charactersRepository.findManyByAccountId(
      account.id.toString()
    )

    return right({ account, characters })
  }
}
