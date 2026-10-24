import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common'
import { z } from 'zod'
import { ResourceNotFoundError } from '@/core/errors/err/resource-not-found-error'
import { DraftPveBattleUseCase } from '@/domain/combat/applications/use-cases/draft-pve-battle'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { usernameParamSchema } from '../../schemas/common'

const draftPveBattleBodySchema = z.object({
  npcSquadKey: z.string(),
})

type DraftPveBattleBodySchema = z.infer<typeof draftPveBattleBodySchema>

/** POST /accounts/:username/battle-drafts — escolhe o adversário e mostra o campo sorteado (D28, D112). */
@Controller('accounts/:username/battle-drafts')
export class DraftPveBattleController {
  constructor(private draftPveBattle: DraftPveBattleUseCase) {}

  @Post()
  @HttpCode(201)
  async handle(
    @Param('username', new ZodValidationPipe(usernameParamSchema))
    username: string,
    @Body(new ZodValidationPipe(draftPveBattleBodySchema))
    body: DraftPveBattleBodySchema
  ) {
    const result = await this.draftPveBattle.execute({
      username,
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
