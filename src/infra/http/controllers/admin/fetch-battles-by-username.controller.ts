import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common'
import { z } from 'zod'
import { FetchBattlesByUsernameUseCase } from '@/domain/combat/applications/use-cases/fetch-battles-by-username'
import { BattleStatus } from '@/domain/combat/enums/battle-enums'
import { Admin } from '@/infra/auth/admin'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { usernameParamSchema } from '../../schemas/common'

const fetchBattlesByUsernameQuerySchema = z.object({
  status: z.nativeEnum(BattleStatus).optional(),
})

type FetchBattlesByUsernameQuerySchema = z.infer<
  typeof fetchBattlesByUsernameQuerySchema
>

/** GET /admin/accounts/:username/battles?status= — as batalhas de qualquer conta (como em `GET /me/battles`). */
@Controller('admin/accounts')
@Admin()
export class FetchBattlesByUsernameController {
  constructor(private fetchBattlesByUsername: FetchBattlesByUsernameUseCase) {}

  @Get(':username/battles')
  async handle(
    @Param('username', new ZodValidationPipe(usernameParamSchema))
    username: string,
    @Query(new ZodValidationPipe(fetchBattlesByUsernameQuerySchema))
    query: FetchBattlesByUsernameQuerySchema
  ) {
    const result = await this.fetchBattlesByUsername.execute({
      username,
      status: query.status,
    })

    if (result.isLeft()) throw new NotFoundException(result.value.message)

    return { battles: result.value.battles }
  }
}
