import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
} from '@nestjs/common'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { GetCharacterUseCase } from '@/domain/characters/applications/use-cases/get-character'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { CharacterPresenter } from '../../presenters/character-presenter'
import { uuidParamSchema } from '../../schemas/common'

/** GET /characters/:id — só da conta logada. */
@Controller('characters')
export class GetCharacterController {
  constructor(
    private getCharacter: GetCharacterUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Get(':id')
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) characterId: string,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.getCharacter.execute({
      characterId,
      accountId: user.sub,
    })

    if (result.isLeft()) {
      const error = result.value

      switch (error.constructor) {
        case ResourceNotFoundError:
          throw new NotFoundException(error.message)
        case NotAllowedError:
          throw new ForbiddenException(error.message)
        default:
          throw new BadRequestException(error.message)
      }
    }

    const catalog = await this.catalogRepository.load()

    return {
      character: CharacterPresenter.toHTTP(result.value.character, catalog),
    }
  }
}
