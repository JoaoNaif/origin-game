import { Either, left, right } from '@/core/either'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { Account } from '@/domain/accounts/entities/account'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { Squad } from '../../entities/squad'
import { InvalidSquadError } from '../../errors/invalid-squad-error'
import { SquadsRepository } from '../repositories/squads-repository'
import { loadSquadMembers, SquadMemberRequest } from './squad-members'

interface CreateSquadUseCaseRequest {
  username: string
  name: string
  members: SquadMemberRequest[]
}

type CreateSquadUseCaseResponse = Either<
  ResourceNotFoundError | InvalidSquadError,
  { squad: Squad }
>

/** Salva uma formação da conta: 4 personagens dela na grade 3x3 (D11, D35). */
export class CreateSquadUseCase {
  constructor(
    private accountsRepository: AccountsRepository,
    private charactersRepository: CharactersRepository,
    private squadsRepository: SquadsRepository
  ) {}

  async execute({
    username,
    name,
    members,
  }: CreateSquadUseCaseRequest): Promise<CreateSquadUseCaseResponse> {
    const account = await this.accountsRepository.findByUsername(
      Account.normalizeUsername(username)
    )
    if (!account) return left(new ResourceNotFoundError('conta'))

    const loaded = await loadSquadMembers(this.charactersRepository, members)
    if (loaded.isLeft()) return left(loaded.value)

    const created = Squad.create({ account, name, members: loaded.value })
    if (created.isLeft()) return left(created.value)

    await this.squadsRepository.create(created.value)

    return right({ squad: created.value })
  }
}
