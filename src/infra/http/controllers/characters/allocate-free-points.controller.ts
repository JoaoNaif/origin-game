import {
  BadRequestException,
  Body,
  Controller,
  NotFoundException,
  Param,
  Put,
} from '@nestjs/common'
import { z } from 'zod'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { AllocateFreePointsUseCase } from '@/domain/characters/applications/use-cases/allocate-free-points'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { CharacterPresenter } from '../../presenters/character-presenter'
import { statBlockSchema, uuidParamSchema } from '../../schemas/common'

type AllocateFreePointsBodySchema = z.infer<typeof statBlockSchema>

/** PUT /characters/:id/free-points — a distribuição inteira, os 7 stats. */
@Controller('characters')
export class AllocateFreePointsController {
  constructor(
    private allocateFreePoints: AllocateFreePointsUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Put(':id/free-points')
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) characterId: string,
    @Body(new ZodValidationPipe(statBlockSchema))
    body: AllocateFreePointsBodySchema
  ) {
    const result = await this.allocateFreePoints.execute({
      characterId,
      freePoints: body,
    })

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
      character: CharacterPresenter.toHTTP(result.value.character, catalog),
    }
  }
}
