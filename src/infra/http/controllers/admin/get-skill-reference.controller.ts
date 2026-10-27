import { Controller, Get, Query } from '@nestjs/common'
import { z } from 'zod'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { skillReference } from '@/domain/skills/services/skill-reference'
import { Admin } from '@/infra/auth/admin'
import { ZodValidationPipe } from '../../pipes/zod-validation-pipe'

const getSkillReferenceQuerySchema = z.object({
  tier: z.nativeEnum(SkillTier),
  target: z.nativeEnum(SkillTarget),
  range: z.nativeEnum(SkillRange).optional(),
  area: z.nativeEnum(SkillArea),
  isNone: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
})

type GetSkillReferenceQuerySchema = z.infer<typeof getSkillReferenceQuerySchema>

/**
 * GET /admin/skills/reference?tier=&target=&range=&area=&isNone= — os valores de referência (Poder, Desgaste, cooldown e
 * nível mínimo) do tipo + forma (D16, D92), para a tela comparar enquanto o admin monta a skill.
 */
@Controller('admin/skills/reference')
@Admin()
export class GetSkillReferenceController {
  @Get()
  handle(
    @Query(new ZodValidationPipe(getSkillReferenceQuerySchema))
    query: GetSkillReferenceQuerySchema
  ) {
    return { reference: skillReference(query) }
  }
}
