import { z } from 'zod'
import { Lineage } from '@/domain/characters/enums/lineage'

/** Compra ou venda de fragmentos: o tipo (linhagem, `NONE` = Neutro) e a quantidade; limites são regra do domínio. */
export const fragmentTradeBodySchema = z.object({
  type: z.nativeEnum(Lineage),
  amount: z.number().int(),
})

export type FragmentTradeBodySchema = z.infer<typeof fragmentTradeBodySchema>
