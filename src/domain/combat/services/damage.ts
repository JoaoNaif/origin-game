/** Ganho do aprimoramento de skill (D100): +15% de Poder (ou de efeito, em cura e escudo). */
export const ENHANCEMENT_BONUS = 0.15

/** Cura e escudo (D92): Poder 1,0 = 10% do HP máximo do alvo. */
export const HEAL_SHARE_PER_POWER = 0.1

/**
 * Poder efetivo da skill. `enhancementShare` é quanto do aprimoramento vale na partida: 1 no PvE e na Platina,
 * 0,5 no Ouro, 0 no Bronze e na Prata (D99).
 */
export function effectivePower(
  power: number,
  isEnhanced: boolean,
  enhancementShare = 1
): number {
  return isEnhanced ? power * (1 + ENHANCEMENT_BONUS * enhancementShare) : power
}

/**
 * Dano base (D68): `Poder × Ataque² / (Ataque + Defesa)`. Razão, não subtração: nunca zera e o equilíbrio é o mesmo
 * em qualquer nível. Sem variação aleatória nem crítico. Ataque e Defesa já com buffs, debuffs e Desgaste.
 * Depois deste valor vêm, nesta ordem: queda da linha, modificadores de dano, Defender, escudo e HP (D68).
 */
export function baseDamage(
  power: number,
  attack: number,
  defense: number
): number {
  return (power * attack * attack) / (attack + defense)
}

/** Dano final em inteiro: arredonda, mas um acerto sempre tira pelo menos 1 (o dano nunca zera, D68). */
export function finalDamage(damage: number): number {
  return Math.max(1, Math.round(damage))
}

/** Quanto uma cura ou escudo rende (D92), em inteiro. */
export function healAmount(power: number, targetMaxHp: number): number {
  return Math.round(power * HEAL_SHARE_PER_POWER * targetMaxHp)
}

export interface DamageResult {
  /** Quanto o escudo absorveu. */
  shieldAbsorbed: number
  /** Quanto saiu do HP. */
  hpLost: number
  shieldLeft: number
  hpLeft: number
}

/**
 * Aplica o dano no alvo (fim da ordem do D68): o escudo absorve primeiro (é a única forma de "passar" do HP, 8.3),
 * o resto sai do HP, que não fica negativo. `ignoreShield` é para passivas como a do Ecko (D83).
 */
export function applyDamage(
  damage: number,
  target: { hp: number; shield: number },
  ignoreShield = false
): DamageResult {
  const shieldAbsorbed = ignoreShield ? 0 : Math.min(target.shield, damage)
  const hpLost = Math.min(target.hp, damage - shieldAbsorbed)

  return {
    shieldAbsorbed,
    hpLost,
    shieldLeft: target.shield - shieldAbsorbed,
    hpLeft: target.hp - hpLost,
  }
}
