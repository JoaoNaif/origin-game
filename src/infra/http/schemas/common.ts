import { z } from 'zod'
import { Stat } from '@/domain/characters/enums/stat'

// Schemas reaproveitados por mais de um controller.

export const uuidParamSchema = z.string().uuid()

/** Username vindo da URL: o formato fino é regra do domínio (`Account.create`). */
export const usernameParamSchema = z.string().trim().min(1)

/** Um valor inteiro para cada um dos 7 stats; limites (total, teto da classe) são regra do domínio. */
export const statBlockSchema = z.object(
  Object.fromEntries(
    Object.values(Stat).map((stat) => [stat, z.number().int()])
  ) as Record<Stat, z.ZodNumber>
)

/** Célula da grade 3x3; "dentro da grade" é regra do domínio. */
export const gridPositionSchema = z.object({
  row: z.number().int(),
  column: z.number().int(),
})
