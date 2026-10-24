import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  NotFoundException,
  Post,
} from '@nestjs/common'
import { z } from 'zod'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { DraftPveBattleUseCase } from '@/domain/combat/applications/use-cases/draft-pve-battle'
import { CurrentUser } from '@/infra/auth/current-user.decorator'
import { AccountPayload } from '@/infra/auth/jwt-strategy'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'

const draftPveBattleBodySchema = z.object({
  npcSquadKey: z.string(),
})

type DraftPveBattleBodySchema = z.infer<typeof draftPveBattleBodySchema>

/** POST /me/battle-drafts — escolhe o adversário e mostra o campo sorteado (D28, D112). */
@Controller('me/battle-drafts')
export class DraftPveBattleController {
  constructor(private draftPveBattle: DraftPveBattleUseCase) {}

  @Post()
  @HttpCode(201)
  async handle(
    @Body(new ZodValidationPipe(draftPveBattleBodySchema))
    body: DraftPveBattleBodySchema,
    @CurrentUser() user: AccountPayload
  ) {
    const result = await this.draftPveBattle.execute({
      accountId: user.sub,
      npcSquadKey: body.npcSquadKey,
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

    const { draft, npcSquad, field } = result.value

    // a seed fica no servidor (D33)
    return {
      draft: {
        id: draft.id.toString(),
        opponent: {
          key: npcSquad.key,
          name: npcSquad.name,
          profile: npcSquad.profile,
          difficulty: npcSquad.difficulty,
        },
        // quem tem qualquer um dos traços pedidos ganha o bônus (D98): é o que o jogador usa para montar o squad
        field,
      },
    }
  }
}
