import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common'
import { z } from 'zod'
import { NotAllowedError } from '@/core/errors/err/not-allowed-error'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { ChooseSkillOfferUseCase } from '@/domain/characters/applications/use-cases/choose-skill-offer'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { CharacterPresenter } from '../../presenters/character-presenter'
import { uuidParamSchema } from '../../schemas/common'

const chooseSkillOfferBodySchema = z.object({
  skillKey: z.string(),
})

type ChooseSkillOfferBodySchema = z.infer<typeof chooseSkillOfferBodySchema>

/**
 * POST /skill-offers/:id/choose — escolhe 1 skill do bloco (D77). O personagem aprende e ela fica guardada; para
 * usar na batalha, entra na build (PUT /characters/:id/build).
 */
@Controller('skill-offers')
export class ChooseSkillOfferController {
  constructor(
    private chooseSkillOffer: ChooseSkillOfferUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Post(':id/choose')
  @HttpCode(200)
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) offerId: string,
    @Body(new ZodValidationPipe(chooseSkillOfferBodySchema))
    body: ChooseSkillOfferBodySchema,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.chooseSkillOffer.execute({
      offerId,
      accountId: user.sub,
      skillKey: body.skillKey,
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
