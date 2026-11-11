import { Rng } from '@/core/rng/rng'
import { CharacterTemplate } from '@/domain/characters/entities/character-template'
import { Exclusivity } from '@/domain/characters/enums/exclusivity'
import { Rarity } from '@/domain/characters/enums/rarity'
import { GearTemplate } from '@/domain/gear/entities/gear-template'
import { GEAR_GRADE_RARITY, gearSaleValue } from '@/domain/gear/gear-values'
import {
  CHEST_FRAGMENTS,
  CHEST_Q,
  RARITY_ORDER,
  RARITY_SALE_VALUE,
} from '../economy-values'
import {
  addFragments,
  FRAGMENT_TYPES,
  Fragments,
} from '../value-objects/fragments'

/**
 * Chance de cada raridade de item num baú (3.5): peso `q^r`, com `r` de 0 (E) a 6 (SS). Qualquer baú pode dar qualquer
 * raridade (D79); o nível do baú só muda a porcentagem.
 */
export function chestRarityChances(tier: Rarity): Record<Rarity, number> {
  const q = CHEST_Q[tier]
  const weights = RARITY_ORDER.map((_, r) => q ** r)
  const total = weights.reduce((sum, w) => sum + w, 0)

  return Object.fromEntries(
    RARITY_ORDER.map((rarity, r) => [rarity, weights[r] / total])
  ) as Record<Rarity, number>
}

export interface ChestDraw {
  rarity: Rarity
  /** Personagem novo para a conta. */
  template: CharacterTemplate | null
  /** Personagem que a conta já tem: vira moeda (D82). */
  convertedTemplate: CharacterTemplate | null
  /** Equipamento novo para o inventário. */
  gear: GearTemplate | null
  /** Equipamento que não coube no inventário: vira moeda pelo valor de venda. */
  convertedGear: GearTemplate | null
  /** Valor do repetido, do equipamento sem espaço ou da raridade sem item (3.3). */
  coins: number
  fragments: Fragments
}

export interface DrawChestInput {
  tier: Rarity
  templates: Iterable<CharacterTemplate>
  /** Modelos que a conta já tem (id do modelo). */
  ownedTemplateIds: ReadonlySet<string>
  /** Modelos de equipamento do catálogo (o Divino nunca sai de baú). */
  gearTemplates?: Iterable<GearTemplate>
  /** Cabe mais um equipamento no inventário. */
  hasInventoryRoom?: boolean
  rng: Rng
}

/**
 * Abre um baú (D150): 1 item da raridade sorteada (com um item por baú, o retorno bate os ~32% / 16% / 8% do 3.5) e
 * os fragmentos do nível do baú, de tipo sorteado. O item é um personagem não exclusivo daquela raridade (D82) ou um
 * equipamento vivo do grau equivalente (Escudeiro ≈ E, Cavaleiro ≈ C, Mestre ≈ A, Rei ≈ SS): se a raridade tem os
 * dois, metade de chance para cada (D153). Personagem que a conta já tem, equipamento sem espaço no inventário ou
 * raridade sem item viram moeda pelo valor de venda.
 */
export function drawChest({
  tier,
  templates,
  ownedTemplateIds,
  gearTemplates = [],
  hasInventoryRoom = true,
  rng,
}: DrawChestInput): ChestDraw {
  const rarity = drawRarity(tier, rng)
  const candidates = [...templates]
    .filter((t) => t.rarity === rarity && t.exclusivity === Exclusivity.NONE)
    .sort((a, b) => a.key.localeCompare(b.key))
  const gearCandidates = [...gearTemplates]
    .filter((g) => GEAR_GRADE_RARITY[g.grade] === rarity)
    .sort((a, b) => a.key.localeCompare(b.key))

  // metade para cada lado quando a raridade tem os dois (o sorteio do lado só gasta a sorte nesse caso)
  const isGear =
    gearCandidates.length > 0 &&
    (candidates.length === 0 || rng.next() < GEAR_CHEST_SHARE)

  if (isGear) {
    const gear = rng.pick(gearCandidates)
    const fragments = drawFragments(tier, rng)

    return {
      rarity,
      template: null,
      convertedTemplate: null,
      gear: hasInventoryRoom ? gear : null,
      convertedGear: hasInventoryRoom ? null : gear,
      coins: hasInventoryRoom ? 0 : (gearSaleValue(gear.grade) ?? 0),
      fragments,
    }
  }

  const picked = candidates.length > 0 ? rng.pick(candidates) : null
  const isNew = picked !== null && !ownedTemplateIds.has(picked.id.toValue())

  const fragments = drawFragments(tier, rng)

  return {
    rarity,
    template: isNew ? picked : null,
    convertedTemplate: isNew ? null : picked,
    gear: null,
    convertedGear: null,
    coins: isNew ? 0 : RARITY_SALE_VALUE[rarity],
    fragments,
  }
}

/** Chance do equipamento quando a raridade sorteada tem personagem e equipamento (D153). */
export const GEAR_CHEST_SHARE = 0.5

function drawFragments(tier: Rarity, rng: Rng): Fragments {
  let fragments: Fragments = {}
  for (let i = 0; i < CHEST_FRAGMENTS[tier]; i++) {
    fragments = addFragments(fragments, { [rng.pick(FRAGMENT_TYPES)]: 1 })
  }

  return fragments
}

function drawRarity(tier: Rarity, rng: Rng): Rarity {
  const chances = chestRarityChances(tier)
  let roll = rng.next()
  for (const rarity of RARITY_ORDER) {
    roll -= chances[rarity]
    if (roll < 0) return rarity
  }

  return RARITY_ORDER[RARITY_ORDER.length - 1]
}
