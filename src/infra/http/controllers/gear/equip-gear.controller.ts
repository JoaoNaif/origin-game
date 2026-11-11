import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common'
import { z } from 'zod'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { EquipGearUseCase } from '@/domain/gear/applications/use-cases/equip-gear'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { economyHttpError } from '../../economy-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { GearPresenter } from '../../presenters/gear-presenter'
import { uuidParamSchema } from '../../schemas/common'

const equipGearBodySchema = z.object({ characterId: uuidParamSchema })

type EquipGearBodySchema = z.infer<typeof equipGearBodySchema>

/**
 * POST /gear/:id/equip — põe o equipamento no slot do personagem (um só, arma ou armadura, D94). O que estava no slot
 * volta para o inventário (`unequipped`).
 */
@Controller('gear')
export class EquipGearController {
  constructor(
    private equipGear: EquipGearUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Post(':id/equip')
  @HttpCode(200)
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) gearId: string,
    @Body(new ZodValidationPipe(equipGearBodySchema)) body: EquipGearBodySchema,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.equipGear.execute({
      accountId: user.sub,
      gearId,
      characterId: body.characterId,
    })

    if (result.isLeft()) throw economyHttpError(result.value)

    const catalog = await this.catalogRepository.load()
    const { gear, character, unequipped } = result.value

    return {
      gear: GearPresenter.toHTTP(gear, catalog, character),
      unequipped: unequipped ? GearPresenter.toHTTP(unequipped, catalog) : null,
    }
  }
}
