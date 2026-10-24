import { Provider } from '@nestjs/common'
import { AccountsRepository } from '@/domain/accounts/applications/repositories/accounts-repository'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { CharactersRepository } from '@/domain/characters/applications/repositories/characters-repository'
import { AllocateFreePointsUseCase } from '@/domain/characters/applications/use-cases/allocate-free-points'
import { EquipSkillsUseCase } from '@/domain/characters/applications/use-cases/equip-skills'
import { FetchAccountCharactersUseCase } from '@/domain/characters/applications/use-cases/fetch-account-characters'
import { GetCharacterUseCase } from '@/domain/characters/applications/use-cases/get-character'

export const charactersUseCases: Provider[] = [
  {
    provide: FetchAccountCharactersUseCase,
    inject: [AccountsRepository, CharactersRepository],
    useFactory: (
      accounts: AccountsRepository,
      characters: CharactersRepository
    ) => new FetchAccountCharactersUseCase(accounts, characters),
  },
  {
    provide: GetCharacterUseCase,
    inject: [CharactersRepository],
    useFactory: (characters: CharactersRepository) =>
      new GetCharacterUseCase(characters),
  },
  {
    provide: EquipSkillsUseCase,
    inject: [CharactersRepository],
    useFactory: (characters: CharactersRepository) =>
      new EquipSkillsUseCase(characters),
  },
  {
    provide: AllocateFreePointsUseCase,
    inject: [CharactersRepository, CatalogRepository],
    useFactory: (
      characters: CharactersRepository,
      catalog: CatalogRepository
    ) => new AllocateFreePointsUseCase(characters, catalog),
  },
]
