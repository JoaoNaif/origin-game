import { Stat } from '@/domain/characters/enums/stat'
import { UnitConditions } from './conditions'
import { DesgasteState, RELIEF } from './desgaste'

/** Defender (D102, 12.5): +50% de Defesa efetiva até o próximo turno do personagem. */
export const DEFEND_DEFENSE_PERCENT = 50

export const DEFEND_SOURCE = 'DEFEND'

/**
 * Defender (D38, 9.5): a ação quando não há skill possível, ou de propósito. Dá +50% de Defesa **fora do limite de
 * fontes** até o início do próximo turno dele e alivia 10% do Desgaste acumulado. Não existe ataque básico grátis.
 */
export function defend(conditions: UnitConditions, desgaste: DesgasteState) {
  conditions.addModifier({
    source: DEFEND_SOURCE,
    stat: Stat.DEFENSE,
    percent: DEFEND_DEFENSE_PERCENT,
    turnsLeft: 1,
    unlimited: true,
  })

  desgaste.relieve(RELIEF.DEFEND)
}
