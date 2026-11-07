import { Body, Controller, HttpCode, Param, Post } from '@nestjs/common'
import { z } from 'zod'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { EnhanceSkillUseCase } from '@/domain/characters/applications/use-cases/enhance-skill'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { economyHttpError } from '../../economy-errors'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { CharacterPresenter } from '../../presenters/character-presenter'
import { WalletPresenter } from '../../presenters/wallet-presenter'
import { uuidParamSchema } from '../../schemas/common'

const enhanceSkillBodySchema = z.object({
  skillKey: z.string(),
})

type EnhanceSkillBodySchema = z.infer<typeof enhanceSkillBodySchema>

/**
 * POST /characters/:id/enhance — tentativa de aprimorar uma skill aprendida (D80, D100): paga moeda + fragmentos da
 * linhagem dela e tem 25% de chance. `success` diz se deu certo; na falha o custo é perdido.
 */
@Controller('characters')
export class EnhanceSkillController {
  constructor(
    private enhanceSkill: EnhanceSkillUseCase,
    private catalogRepository: CatalogRepository
  ) {}

  @Post(':id/enhance')
  @HttpCode(200)
  async handle(
    @Param('id', new ZodValidationPipe(uuidParamSchema)) characterId: string,
    @Body(new ZodValidationPipe(enhanceSkillBodySchema))
    body: EnhanceSkillBodySchema,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.enhanceSkill.execute({
      characterId,
      accountId: user.sub,
      skillKey: body.skillKey,
    })

    if (result.isLeft()) throw economyHttpError(result.value)

    const { success, chance, character, wallet } = result.value
    const catalog = await this.catalogRepository.load()

    return {
      success,
      chance,
      character: CharacterPresenter.toHTTP(character, catalog),
      wallet: WalletPresenter.toHTTP(wallet),
    }
  }
}
