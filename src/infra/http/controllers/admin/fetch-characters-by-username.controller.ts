import { Controller, Get, NotFoundException, Param } from '@nestjs/common'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { FetchCharactersByUsernameUseCase } from '@/domain/characters/applications/use-cases/fetch-characters-by-username'
import { Admin } from '@/infra/auth/admin'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { CharacterPresenter } from '../../presenters/character-presenter'
import { usernameParamSchema } from '../../schemas/common'

/** GET /admin/accounts/:username/characters — os personagens de qualquer conta (como em `GET /me/characters`). */
@Controller('admin/accounts')
@Admin()
export class FetchCharactersByUsernameController {
  constructor(
    private fetchCharactersByUsername: FetchCharactersByUsernameUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Get(':username/characters')
  async handle(
    @Param('username', new ZodValidationPipe(usernameParamSchema))
    username: string
  ) {
    const result = await this.fetchCharactersByUsername.execute({ username })

    if (result.isLeft()) throw new NotFoundException(result.value.message)

    const catalog = await this.catalogRepository.load()
    return {
      characters: result.value.characters.map((c) =>
        CharacterPresenter.toHTTP(c, catalog)
      ),
    }
  }
}
