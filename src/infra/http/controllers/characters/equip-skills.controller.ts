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
import { EquipSkillsUseCase } from '@/domain/characters/applications/use-cases/equip-skills'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { CharacterPresenter } from '../../presenters/character-presenter'
import { uuidParamSchema } from '../../schemas/common'

// quantidade e repetição são regra do domínio (`Character.equipSkills`)
const equipSkillsBodySchema = z.object({
  skillKeys: z.array(z.string()),
})

type EquipSkillsBodySchema = z.infer<typeof equipSkillsBodySchema>

/** PUT /characters/:id/build */
@Controller('characters')
export class EquipSkillsController {
  constructor(
    private equipSkills: EquipSkillsUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Put(':id/build')
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) characterId: string,
    @Body(new ZodValidationPipe(equipSkillsBodySchema))
    body: EquipSkillsBodySchema
  ) {
    const result = await this.equipSkills.execute({
      characterId,
      skillKeys: body.skillKeys,
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
