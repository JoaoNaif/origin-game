import {
  ARTILLERY_BACK_DAMAGE_PERCENT,
  EXECUTOR_LONE_ATTACK_PERCENT,
  FORMATION_STAT_AURA,
  SUPPORT_HEAL_AURA_PERCENT,
} from '@/domain/combat/engine/battle-engine'

/** Bônus de formação (D128): os mesmos valores que o motor aplica, para a tela não precisar copiar. */
export class FormationBonusesPresenter {
  static toHTTP() {
    return {
      statAuras: Object.entries(FORMATION_STAT_AURA).map(
        ([characterClass, aura]) => ({
          characterClass,
          stat: aura.stat,
          percent: aura.percent,
        })
      ),
      supportHealPercent: SUPPORT_HEAL_AURA_PERCENT,
      artilleryBackDamagePercent: ARTILLERY_BACK_DAMAGE_PERCENT,
      executorLoneAttackPercent: EXECUTOR_LONE_ATTACK_PERCENT,
    }
  }
}
