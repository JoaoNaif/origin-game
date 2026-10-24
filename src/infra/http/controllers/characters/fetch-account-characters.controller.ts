import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
} from '@nestjs/common'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { FetchAccountCharactersUseCase } from '@/domain/characters/applications/use-cases/fetch-account-characters'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { CharacterPresenter } from '../../presenters/character-presenter'
import { usernameParamSchema } from '../../schemas/common'

/** GET /accounts/:username/characters */
@Controller('accounts/:username/characters')
export class FetchAccountCharactersController {
  constructor(
    private fetchAccountCharacters: FetchAccountCharactersUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Get()
  async handle(
    @Param('username', new ZodValidationPipe(usernameParamSchema))
    username: string
  ) {
    const result = await this.fetchAccountCharacters.execute({ username })

    if (result.isLeft()) {
      const error = result.value

      switch (error.constructor) {
        case ResourceNotFoundError:
          throw new NotFoundException(error.message)
        default:
          throw new BadRequestException(error.message)
      }
    }

    const catalog = await this.catalogRepository.load()

    return {
      characters: result.value.characters.map((c) =>
        CharacterPresenter.toHTTP(c, catalog)
      ),
    }
  }
}
