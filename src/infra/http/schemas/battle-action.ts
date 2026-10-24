import { z } from 'zod'
import { BattleSide } from '@/domain/combat/enums/battle-enums'
import { gridPositionSchema } from './common'

/**
 * Jogada do jogador (`data_model.md` 3.11). Sem `timeout` no DEFEND: o Defender por tempo esgotado é do servidor
 * (D38), o cliente não pode pedir. O que é legal (alcance, alvo, recarga) o motor decide.
 */
export const battleActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('SKILL'),
    skillKey: z.string(),
    targetSide: z.nativeEnum(BattleSide),
    target: gridPositionSchema,
    swapWith: gridPositionSchema.optional(),
    moveTo: gridPositionSchema.optional(),
    fieldKey: z.string().optional(),
  }),
  z.object({ type: z.literal('MOVE'), to: gridPositionSchema }),
  z.object({ type: z.literal('SWAP'), withRef: z.string() }),
  z.object({ type: z.literal('DEFEND') }),
])
