import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  HttpCode,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common'
import { z } from 'zod'
import { ResourceAlreadyExistsError } from '@/core/errors/err/resource-already-exists-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { GrantCharacterUseCase } from '@/domain/characters/applications/use-cases/grant-character'
import { Admin } from '@/infra/auth/admin'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { CharacterPresenter } from '../../presenters/character-presenter'
import { catalogKeySchema } from '../../schemas/catalog'
import { usernameParamSchema } from '../../schemas/common'

const grantCharacterBodySchema = z.object({ templateKey: catalogKeySchema })

type GrantCharacterBodySchema = z.infer<typeof grantCharacterBodySchema>

/** POST /admin/accounts/:username/characters — dá um personagem (nível 0, kit na build) a uma conta. */
@Controller('admin/accounts')
@Admin()
export class GrantCharacterController {
  constructor(
    private grantCharacter: GrantCharacterUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Post(':username/characters')
  @HttpCode(201)
  async handle(
    @Param('username', new ZodValidationPipe(usernameParamSchema))
    username: string,
    @Body(new ZodValidationPipe(grantCharacterBodySchema))
    body: GrantCharacterBodySchema
  ) {
    const result = await this.grantCharacter.execute({ username, ...body })

    if (result.isLeft()) {
      const error = result.value

      switch (error.constructor) {
        case ResourceNotFoundError:
          throw new NotFoundException(error.message)
        case ResourceAlreadyExistsError:
          throw new ConflictException(error.message)
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
