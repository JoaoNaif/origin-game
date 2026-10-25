/** Ganho do aprimoramento de skill (D100): +15% de Poder (ou de efeito, em cura e escudo). */
export const ENHANCEMENT_BONUS = 0.15

/** Cura e escudo (D92): Poder 1,0 = 10% do HP máximo do alvo (do nível 40 em diante, D137). */
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
 * Escala do dano (D131): ×0,7 para dar tempo à tática (com um personagem caindo em 1 ou 2 turnos de foco, não havia
 * tempo para preparar e executar; na simulação, a squad tática passou de 35% para 60% contra a de força bruta).
 */
export const DAMAGE_SCALE = 0.7

/**
 * Níveis baixos (D137): até o nível 20 o dano é ×1,2 e a cura e o escudo rendem 8% por Poder (só com o kit de Poder
 * ~0,8, a batalha arrastava em ~24 rodadas); daí em linha reta até a escala cheia (×0,7 e 10%) no nível 40, onde já
 * há skills de Poder 1,4 a 1,6 e mais dano esmagaria a squad tática.
 */
export const LOW_LEVEL_DAMAGE_SCALE = 1.2
export const LOW_LEVEL_HEAL_SHARE = 0.08
export const LOW_LEVEL_SCALE_UNTIL = 20
export const FULL_SCALE_FROM_LEVEL = 40

/** Quanto do ajuste de nível baixo vale: 1 até o nível 20, 0 do 40 em diante. */
function lowLevelWeight(level: number): number {
  const span = FULL_SCALE_FROM_LEVEL - LOW_LEVEL_SCALE_UNTIL

  return Math.min(1, Math.max(0, (FULL_SCALE_FROM_LEVEL - level) / span))
}

/** Escala do dano no nível da batalha (D131, D137): ×1,2 até o nível 20, ×0,7 do 40 em diante. */
export function damageScale(level: number): number {
  const weight = lowLevelWeight(level)

  return DAMAGE_SCALE + (LOW_LEVEL_DAMAGE_SCALE - DAMAGE_SCALE) * weight
}

/** Cura e escudo por Poder no nível da batalha (D92, D137): 8% até o nível 20, 10% do 40 em diante. */
export function healShare(level: number): number {
  const weight = lowLevelWeight(level)

  return (
    HEAL_SHARE_PER_POWER +
    (LOW_LEVEL_HEAL_SHARE - HEAL_SHARE_PER_POWER) * weight
  )
}

/**
 * Dano base (D68, D131): `Poder × Ataque² / (Ataque + Defesa) × escala`. Razão, não subtração: nunca zera. Sem variação
 * aleatória nem crítico. Ataque e Defesa já com buffs, debuffs e Desgaste. A escala vem do nível da batalha
 * (`damageScale`, D137); sem ela, a cheia (×0,7). Depois deste valor vêm, nesta ordem: queda da linha, modificadores de
 * dano, Defender, escudo e HP (D68).
 */
export function baseDamage(
  power: number,
  attack: number,
  defense: number,
  scale = DAMAGE_SCALE
): number {
  return ((power * attack * attack) / (attack + defense)) * scale
}

/** Dano final em inteiro: arredonda, mas um acerto sempre tira pelo menos 1 (o dano nunca zera, D68). */
export function finalDamage(damage: number): number {
  return Math.max(1, Math.round(damage))
}

/** Quanto uma cura ou escudo rende (D92), em inteiro. `share` vem do nível da batalha (`healShare`, D137). */
export function healAmount(
  power: number,
  targetMaxHp: number,
  share = HEAL_SHARE_PER_POWER
): number {
  return Math.round(power * share * targetMaxHp)
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
