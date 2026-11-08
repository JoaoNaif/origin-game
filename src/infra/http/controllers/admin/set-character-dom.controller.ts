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
import { SetCharacterDomUseCase } from '@/domain/characters/applications/use-cases/set-character-dom'
import { DomLevel } from '@/domain/characters/enums/dom-level'
import { DomPillar } from '@/domain/characters/enums/dom-pillar'
import { DomPillars } from '@/domain/characters/value-objects/dom-state'
import { Admin } from '@/infra/auth/admin'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { CharacterPresenter } from '../../presenters/character-presenter'
import { uuidParamSchema } from '../../schemas/common'

const level = z.nativeEnum(DomLevel).nullable().optional()

const setCharacterDomBodySchema = z.object({
  pillars: z
    .object(
      Object.fromEntries(
        Object.values(DomPillar).map((pillar) => [pillar, level])
      ) as Record<DomPillar, typeof level>
    )
    .strict(),
})

type SetCharacterDomBodySchema = z.infer<typeof setCharacterDomBodySchema>

/**
 * PUT /admin/characters/:characterId/dom — define os níveis do DOM de um personagem (D152), para testar. Pilar nulo ou
 * ausente = sem DOM nele.
 */
@Controller('admin/characters')
@Admin()
export class SetCharacterDomController {
  constructor(
    private setCharacterDom: SetCharacterDomUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Put(':characterId/dom')
  async handle(
    @Param('characterId', new ZodValidationPipe(uuidParamSchema))
    characterId: string,
    @Body(new ZodValidationPipe(setCharacterDomBodySchema))
    body: SetCharacterDomBodySchema
  ) {
    const pillars: DomPillars = Object.fromEntries(
      Object.entries(body.pillars).filter(([, value]) => value)
    )
    const result = await this.setCharacterDom.execute({ characterId, pillars })

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
