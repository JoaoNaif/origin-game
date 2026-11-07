import { Rarity } from '@/domain/characters/enums/rarity'
import { SkillTier } from '@/domain/skills/enums/skill-tier'

/**
 * Valores da economia (D100, D104, D150; `progression_brief.md` Parte 3). Placeholders aprovados, a ajustar com
 * simulação. Âncora: 1 dia de jogo ≈ 10 batalhas ≈ 1.000 moedas (M).
 */

/** Moeda no fim da batalha (3.1), antes dos modificadores (dificuldade e mesmo NPC). */
export const BATTLE_COINS = { WIN: 130, LOSS: 70 } as const

/** Fragmentos no fim da batalha (3.9), com os mesmos modificadores da moeda; a fração sai pela seed. */
export const BATTLE_FRAGMENTS = { WIN: 2, LOSS: 1 } as const

/**
 * Chance de baú no fim da batalha (3.5), num sorteio só (no máximo um baú). Na derrota, metade; contra o mesmo NPC,
 * cai junto com a moeda (D150).
 */
export const BATTLE_CHEST_DROP: readonly { tier: Rarity; chance: number }[] = [
  { tier: Rarity.C, chance: 0.01 },
  { tier: Rarity.D, chance: 0.05 },
  { tier: Rarity.E, chance: 0.2 },
]
export const LOSS_CHEST_DROP_FACTOR = 0.5

/** Limite por tipo de fragmento (3.9). O que passar vira moeda pelo preço de venda (D150). */
export const FRAGMENT_CAP = 500

/** Compra e venda de fragmentos ao sistema (3.9), por unidade. */
export const FRAGMENT_PRICE = { BUY: 200, SELL: 40 } as const

/** Valor de venda ao sistema por raridade (3.3): também é o que vale o personagem repetido. */
export const RARITY_SALE_VALUE: Record<Rarity, number> = {
  E: 40,
  D: 100,
  C: 250,
  B: 600,
  A: 1_500,
  S: 3_500,
  SS: 9_000,
}

/** Ordem da raridade (E = 0 a SS = 6), usada no peso `q^r` do baú. */
export const RARITY_ORDER: readonly Rarity[] = [
  Rarity.E,
  Rarity.D,
  Rarity.C,
  Rarity.B,
  Rarity.A,
  Rarity.S,
  Rarity.SS,
]

/** `q` de cada nível de baú (3.5): o item de raridade `r` pesa `q^r`. */
export const CHEST_Q: Record<Rarity, number> = {
  E: 0.3,
  D: 0.4,
  C: 0.5,
  B: 0.65,
  A: 0.8,
  S: 1,
  SS: 1.3,
}

/** Baús compráveis com moeda (3.5). De B a SS: eventos, ranqueado e missões. */
export const CHEST_PRICE: Partial<Record<Rarity, number>> = {
  E: 300,
  D: 1_000,
  C: 3_500,
}

/**
 * Fragmentos que vêm junto com o item do baú (D150), de tipo sorteado entre os 7. E, D e C aprovados; de B em diante
 * dobra a cada nível (placeholder, esses baús ainda não caem).
 */
export const CHEST_FRAGMENTS: Record<Rarity, number> = {
  E: 1,
  D: 2,
  C: 4,
  B: 8,
  A: 16,
  S: 32,
  SS: 64,
}

/** Chance do aprimoramento de skill (3.6): fixa, sem pity. Títulos (+10 pontos cada, até 2) entram com os títulos. */
export const ENHANCEMENT_BASE_CHANCE = 0.25

/** Custo de cada tentativa de aprimoramento (3.6): moeda + fragmentos da linhagem da skill. */
export const ENHANCEMENT_COST: Record<
  SkillTier,
  { coins: number; fragments: number }
> = {
  BASIC: { coins: 300, fragments: 3 },
  STANDARD: { coins: 500, fragments: 5 },
  REINFORCED: { coins: 1_000, fragments: 8 },
  STRONG: { coins: 2_000, fragments: 12 },
  FINAL: { coins: 4_000, fragments: 20 },
}
