import { Provider } from '@nestjs/common'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { SquadsRepository } from '@/domain/squads/applications/repositories/squads-repository'
import { CreateSquadUseCase } from '@/domain/squads/applications/use-cases/create-squad'
import { DeleteSquadUseCase } from '@/domain/squads/applications/use-cases/delete-squad'
import { FetchAccountSquadsUseCase } from '@/domain/squads/applications/use-cases/fetch-account-squads'
import { UpdateSquadFormationUseCase } from '@/domain/squads/applications/use-cases/update-squad-formation'

export const squadsUseCases: Provider[] = [
  {
    provide: CreateSquadUseCase,
    inject: [AccountsRepository, CharactersRepository, SquadsRepository],
    useFactory: (
      accounts: AccountsRepository,
      characters: CharactersRepository,
      squads: SquadsRepository
    ) => new CreateSquadUseCase(accounts, characters, squads),
  },
  {
    provide: FetchAccountSquadsUseCase,
    inject: [AccountsRepository, SquadsRepository],
    useFactory: (accounts: AccountsRepository, squads: SquadsRepository) =>
      new FetchAccountSquadsUseCase(accounts, squads),
  },
  {
    provide: UpdateSquadFormationUseCase,
    inject: [CharactersRepository, SquadsRepository],
    useFactory: (characters: CharactersRepository, squads: SquadsRepository) =>
      new UpdateSquadFormationUseCase(characters, squads),
  },
  {
    provide: DeleteSquadUseCase,
    inject: [SquadsRepository],
    useFactory: (squads: SquadsRepository) => new DeleteSquadUseCase(squads),
  },
]
