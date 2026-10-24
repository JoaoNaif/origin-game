import { Controller, Get, Query } from '@nestjs/common'
import { z } from 'zod'
import { FetchAccountBattlesUseCase } from '@/domain/combat/applications/use-cases/fetch-account-battles'
import { BattleStatus } from '@/domain/combat/enums/battle-enums'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'

const fetchAccountBattlesQuerySchema = z.object({
  status: z.nativeEnum(BattleStatus).optional(),
})

type FetchAccountBattlesQuerySchema = z.infer<
  typeof fetchAccountBattlesQuerySchema
>

/**
 * GET /me/battles?status= — as batalhas da conta logada, da mais recente para a mais antiga (até 50). Com
 * `status=IN_PROGRESS`, a que está em andamento, para retomar depois de fechar a aba ou trocar de aparelho.
 */
@Controller('me/battles')
export class FetchAccountBattlesController {
  constructor(private fetchAccountBattles: FetchAccountBattlesUseCase) {}

  @Get()
  async handle(
    @Query(new ZodValidationPipe(fetchAccountBattlesQuerySchema))
    query: FetchAccountBattlesQuerySchema,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.fetchAccountBattles.execute({
      accountId: user.sub,
      status: query.status,
    })

    return { battles: result.value.battles }
  }
}
