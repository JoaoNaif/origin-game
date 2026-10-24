import { z } from 'zod'
import { gridPositionSchema } from './common'

/** Os membros do squad como chegam do cliente; quantidade, dono e célula são regra do domínio (`Squad`). */
export const squadMembersSchema = z.array(
  gridPositionSchema.extend({ characterId: z.string().uuid() })
)
