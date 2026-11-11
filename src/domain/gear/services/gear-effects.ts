import { Stat } from '@/domain/characters/enums/stat'
import { GearTemplate } from '../entities/gear-template'
import { GearBond } from '../enums/gear-bond'
import {
  GEAR_BOND_FACTOR,
  GEAR_FULL_BOND_COST,
  GEAR_LINEAGE_PASSIVE,
  GEAR_NO_VARIANT_BONUS,
  GEAR_PASSIVE_GRADE_FACTOR,
  GEAR_PENALTIES,
  GearLoseAction,
} from '../gear-values'
import { GearPassive } from '../value-objects/gear-passive'

/** O que o equipamento faz no portador, já com o grau, o elo e a falta de variante (D94). */
export interface GearEffects {
  bond: GearBond
  /** Bônus de stats (fora da batalha também, na ficha), em %. */
  bonusPercents: Partial<Record<Stat, number>>
  /** Queda de stats do parcial e do sem elo, em % (negativo), só dentro da batalha. */
  penaltyPercents: Partial<Record<Stat, number>>
  /** Custo do elo pleno: Desgaste no início da batalha, em % do stat da linhagem do equipamento. */
  initialDesgastePercent: number
  /** Efeito leve da linhagem, já escalado. */
  passive: GearPassive
  /** Chance de perder a ação (Mestre para cima, parcial e sem elo). */
  loseAction: GearLoseAction | null
}

/** Arredonda para 2 casas (os % ficam legíveis na ficha e no replay). */
const round2 = (n: number) => Math.round(n * 100) / 100

function scalePassive(passive: GearPassive, factor: number): GearPassive {
  switch (passive.type) {
    case 'DOT_ON_HIT':
      return { type: passive.type, chance: round2(passive.chance * factor) }
    case 'REGEN':
    case 'INITIAL_SHIELD':
      return {
        type: passive.type,
        percentOfMaxHp: round2(passive.percentOfMaxHp * factor),
      }
    case 'SINGLE_TARGET_REDUCTION':
    case 'IGNORE_DEFENSE':
    case 'STATUS_WILL':
      return { type: passive.type, percent: round2(passive.percent * factor) }
  }
}

/**
 * Efeito do equipamento no portador (`living_gear_brief.md` 9.2, 9.3, 9.5, 9.7): bônus e passiva valem 100% / 60% /
 * 30% pelo elo; sem variante, o bônus vale ×1,25; o custo do pleno e as penalidades do parcial e do sem elo.
 */
export function gearEffects(
  template: GearTemplate,
  bond: GearBond,
  hasVariant: boolean
): GearEffects {
  const factor = GEAR_BOND_FACTOR[bond]
  const bonusFactor = factor * (hasVariant ? 1 : GEAR_NO_VARIANT_BONUS)
  const penalty =
    bond === GearBond.FULL ? null : GEAR_PENALTIES[bond][template.grade]

  return {
    bond,
    bonusPercents: {
      [template.primaryStat]: round2(template.primaryPercent * bonusFactor),
      [template.secondaryStat]: round2(template.secondaryPercent * bonusFactor),
    },
    penaltyPercents: { ...(penalty?.statPercents ?? {}) },
    initialDesgastePercent:
      bond === GearBond.FULL ? GEAR_FULL_BOND_COST[template.grade] : 0,
    passive: scalePassive(
      GEAR_LINEAGE_PASSIVE[template.lineage],
      GEAR_PASSIVE_GRADE_FACTOR[template.grade] * factor
    ),
    loseAction: penalty?.loseAction ? { ...penalty.loseAction } : null,
  }
}
