import { Controller, Get } from '@nestjs/common'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { FetchAccountCharactersUseCase } from '@/domain/characters/applications/use-cases/fetch-account-characters'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { CharacterPresenter } from '../../presenters/character-presenter'

/** GET /me/characters — os personagens da conta logada. */
@Controller('me/characters')
export class FetchAccountCharactersController {
  constructor(
    private fetchAccountCharacters: FetchAccountCharactersUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Get()
  async handle(@CurrentUser() user: AccountPayload) {
    const result = await this.fetchAccountCharacters.execute({
      accountId: user.sub,
    })
    const catalog = await this.catalogRepository.load()

    return {
      characters: result.value.characters.map((c) =>
        CharacterPresenter.toHTTP(c, catalog)
      ),
    }
  }
}
