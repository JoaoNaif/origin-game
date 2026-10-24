import { Controller, Get, Query } from '@nestjs/common'
import { Public } from '@/infra/auth/public'
import { z } from 'zod'
import { AiDifficulty } from '@/domain/ai/enums/ai-difficulty'
import { CatalogRepository } from '@/domain/catalog/applications/repositories/catalog-repository'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'
import { NpcSquadPresenter } from '../../presenters/npc-squad-presenter'

const DIFFICULTY_ORDER = Object.values(AiDifficulty)

const fetchNpcSquadsQuerySchema = z.object({
  difficulty: z.nativeEnum(AiDifficulty).optional(),
})

type FetchNpcSquadsQuerySchema = z.infer<typeof fetchNpcSquadsQuerySchema>

/** GET /npc-squads?difficulty= — adversários do PvE (catálogo público), do mais fácil ao mais difícil. */
@Controller('npc-squads')
@Public()
export class FetchNpcSquadsController {
  constructor(private catalogRepository: CatalogRepository) {}

  @Get()
  async handle(
    @Query(new ZodValidationPipe(fetchNpcSquadsQuerySchema))
    query: FetchNpcSquadsQuerySchema
  ) {
    const catalog = await this.catalogRepository.load()
    const squads = catalog.npcSquads
      .filter((s) => !query.difficulty || s.difficulty === query.difficulty)
      .sort(
        (a, b) =>
          DIFFICULTY_ORDER.indexOf(a.difficulty) -
            DIFFICULTY_ORDER.indexOf(b.difficulty) ||
          a.name.localeCompare(b.name)
      )

    return {
      npcSquads: squads.map(NpcSquadPresenter.toHTTP),
    }
  }
}
