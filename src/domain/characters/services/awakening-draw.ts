import { Rng } from '@/core/rng/rng'
import { AWAKENED_MIN_LEVEL } from '@/domain/skills/enums/skill-tier'
import { Awakening } from '../entities/awakening'
import { Character } from '../entities/character'
import { CharacterTemplate } from '../entities/character-template'
import {
  AWAKENING_MISSION_KINDS,
  AwakeningMissionCategory,
} from '../enums/awakening-mission-kind'
import { Stat } from '../enums/stat'
import { AwakeningProgress } from '../value-objects/awakening-progress'
import { StatBlock } from '../value-objects/stat-block'
import { CLASS_STAT_MEAN } from './class-profiles'
import { computeStats } from './stat-calculator'

/** Fator da afinidade no peso do sorteio (D96): peso = `1 + 0,75 × afinidade`. */
export const AWAKENING_AFFINITY_FACTOR = 0.75

/** Sangue puro: limiar das missões ×0,7, para baixo, mínimo 1 (D96, D151). */
export const PURE_BLOOD_THRESHOLD_FACTOR = 0.7

/** Limiar de sangue puro: 100 vira 70, 15 vira 10, 1 continua 1 (arredonda antes, para 0,7 × 100 não virar 69). */
export function pureBloodThreshold(threshold: number): number {
  const scaled = Math.round(threshold * PURE_BLOOD_THRESHOLD_FACTOR * 1000)
  return Math.max(1, Math.floor(scaled / 1000))
}

/** Quantos stats contam como "alto" (os maiores) e como "baixo" (os menores). */
export const RELATIVE_STAT_SPAN = 2

/** Ordem do sorteio das missões: uma de cada categoria. */
const CATEGORY_ORDER: readonly AwakeningMissionCategory[] = [
  AwakeningMissionCategory.ACCUMULATIVE,
  AwakeningMissionCategory.REPEATED,
  AwakeningMissionCategory.MILESTONE,
]

const STAT_ORDER = Object.values(Stat)

/**
 * Os 7 stats do maior para o menor, na régua das classes (D151): cada stat dividido pela média dele nos perfis das 8
 * classes. Empate segue a ordem dos stats.
 */
export function relativeStatRanking(stats: StatBlock): Stat[] {
  const relative = (stat: Stat) => stats[stat] / CLASS_STAT_MEAN[stat]

  return [...STAT_ORDER].sort(
    (a, b) =>
      relative(b) - relative(a) || STAT_ORDER.indexOf(a) - STAT_ORDER.indexOf(b)
  )
}

/** Fração dos requisitos do perfil que o personagem cumpre (0 a 1, `awakening_brief.md` 3.1). */
export function awakeningAffinity(
  awakening: Awakening,
  stats: StatBlock
): number {
  const ranking = relativeStatRanking(stats)
  const high = new Set(ranking.slice(0, RELATIVE_STAT_SPAN))
  const low = new Set(ranking.slice(-RELATIVE_STAT_SPAN))

  const met = awakening.requirements.filter((r) =>
    r.level === 'HIGH' ? high.has(r.stat) : low.has(r.stat)
  ).length

  return met / awakening.requirements.length
}

export function awakeningWeight(affinity: number): number {
  return 1 + AWAKENING_AFFINITY_FACTOR * affinity
}

/** Stats fora da batalha do personagem (nível, pontos livres e traços), os que o sorteio compara. */
export function characterStats(
  character: Character,
  template: CharacterTemplate
): StatBlock {
  return computeStats({
    profile: template.stats,
    level: character.level,
    freePoints: character.freePoints,
    traitEffects: character.traits.flatMap((t) => [...t.effects]),
  })
}

/** Sangue puro (D65, D88): um traço com desconto de Desgaste na própria variante do personagem. */
export function isPureBlood(
  character: Character,
  template: CharacterTemplate
): boolean {
  const variantIds = template.variants.map((v) => v.variantId)

  return character.traits.some(
    (t) =>
      t.variantId !== null &&
      variantIds.some((id) => id.equals(t.variantId!)) &&
      t.effects.some((e) => e.type === 'LINEAGE_COST_MODIFIER' && e.percent < 0)
  )
}

/** Os despertares da variante do personagem, em ordem fixa (mesma sorte, mesmo resultado). */
export function awakeningCandidates(
  template: CharacterTemplate,
  awakenings: Iterable<Awakening>
): Awakening[] {
  if (template.variants.length !== 1) return []
  const base = template.variants[0].variantId

  return [...awakenings]
    .filter((a) => a.baseVariantId.equals(base))
    .sort((a, b) => a.key.localeCompare(b.key))
}

/**
 * Pode entrar no sorteio agora (D67, D151): 1 variante só, nível 80 ou mais, sem despertar e sem sorteio feito. Se a
 * variante não tem despertar, `drawAwakening` não sorteia nada (e tenta de novo na próxima batalha).
 */
export function canDrawAwakening(character: Character): boolean {
  return (
    character.level >= AWAKENED_MIN_LEVEL &&
    !character.isAwakened &&
    character.awakening === null
  )
}

export interface DrawAwakeningInput {
  character: Character
  template: CharacterTemplate
  awakenings: Iterable<Awakening>
  rng: Rng
  now: Date
}

/**
 * Sorteia o despertar e as 3 missões ocultas (D96, D151): o despertar pelo peso da afinidade, depois uma missão de
 * cada categoria do pool dele, com o limiar de sangue puro. `null` = não pode ou a variante não tem despertar.
 */
export function drawAwakening(
  input: DrawAwakeningInput
): AwakeningProgress | null {
  const { character, template, rng, now } = input
  if (!canDrawAwakening(character)) return null

  const candidates = awakeningCandidates(template, input.awakenings)
  if (candidates.length === 0) return null

  const stats = characterStats(character, template)
  const weights = candidates.map((a) =>
    awakeningWeight(awakeningAffinity(a, stats))
  )
  let roll = rng.next() * weights.reduce((sum, w) => sum + w, 0)
  let index = 0
  while (index < candidates.length - 1 && roll >= weights[index]) {
    roll -= weights[index]
    index += 1
  }
  const awakening = candidates[index]

  const pureBlood = isPureBlood(character, template)
  const missions = CATEGORY_ORDER.map((category) => {
    const pool = awakening.missions.filter(
      (m) => AWAKENING_MISSION_KINDS[m.kind].category === category
    )
    const mission = rng.pick(pool)
    const threshold = pureBlood
      ? pureBloodThreshold(mission.threshold)
      : mission.threshold

    return { kind: mission.kind, threshold, progress: 0 }
  })

  return { awakeningId: awakening.id, drawnAt: now, missions }
}
