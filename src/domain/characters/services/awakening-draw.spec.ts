import { beforeEach, describe, expect, it } from 'vitest'
import { SeededRng } from '@/core/rng/seeded-rng'
import { GameCatalog } from '@/domain/catalog/applications/repositories/catalog-repository'
import { makeAccount } from 'test/factories/make-account'
import { characterOf, makeRoster } from 'test/factories/make-roster'
import { makeTrait } from 'test/factories/make-trait'
import { seedCatalog } from 'test/repositories/in-memory-catalog-repository'
import { Awakening } from '../entities/awakening'
import { Character } from '../entities/character'
import { AWAKENING_MISSION_KINDS } from '../enums/awakening-mission-kind'
import { TraitSource } from '../enums/trait-source'
import {
  awakeningAffinity,
  awakeningCandidates,
  awakeningWeight,
  characterStats,
  drawAwakening,
  isPureBlood,
  pureBloodThreshold,
  relativeStatRanking,
} from './awakening-draw'
import { CLASS_PROFILES } from './class-profiles'

let catalog: GameCatalog
let roster: Character[]

const templateOf = (character: Character) =>
  catalog.templates.get(character.templateId.toValue())!
const awakeningByKey = (key: string) =>
  [...catalog.awakenings.values()].find((a) => a.key === key)!

const draw = (character: Character, seed = 1) =>
  drawAwakening({
    character,
    template: templateOf(character),
    awakenings: catalog.awakenings.values(),
    rng: new SeededRng(seed),
    now: new Date('2026-11-07T12:00:00Z'),
  })

/** O mesmo personagem com outros traços (o de família trocado por um de sangue puro). */
function withTraits(character: Character, traits: Character['traits']) {
  return Character.restore(
    {
      accountId: character.accountId,
      templateId: character.templateId,
      level: character.level,
      xp: character.xp,
      danger: character.danger,
      dangerPoints: character.dangerPoints,
      awakenedVariantId: character.awakenedVariantId,
      awakening: null,
      freePoints: { ...character.freePoints },
      traits: [...traits],
      skills: [...character.skills],
    },
    character.id
  )
}

describe('Awakening Draw', () => {
  beforeEach(() => {
    catalog = seedCatalog()
    roster = makeRoster(makeAccount(), catalog, 80)
  })

  it('should be able to rank stats on the class scale', () => {
    // Vanguarda: Defesa 120 / 86,9 e HP 700 / 571 lideram; Velocidade e Esquiva ficam embaixo
    const ranking = relativeStatRanking(CLASS_PROFILES.VANGUARD)

    expect(ranking.slice(0, 2)).toEqual(['DEFENSE', 'HP'])
    expect(ranking.slice(-2)).toEqual(['SPEED', 'EVASION'])
  })

  it('should be able to measure the affinity with the profile', () => {
    // Executor: Ataque e Velocidade no topo, Defesa e Vontade embaixo
    const executor = CLASS_PROFILES.EXECUTOR

    expect(awakeningAffinity(awakeningByKey('sombra-abissal'), executor)).toBe(
      1
    )
    expect(awakeningAffinity(awakeningByKey('eclipse'), executor)).toBe(0)
    expect(awakeningWeight(1)).toBe(1.75)
    expect(awakeningWeight(0)).toBe(1)
  })

  it('should be able to list only the awakenings of a single variant', () => {
    const nox = characterOf(roster, catalog, 'nox')
    const kael = characterOf(roster, catalog, 'kael-vaz')

    expect(
      awakeningCandidates(templateOf(nox), catalog.awakenings.values()).map(
        (a) => a.key
      )
    ).toEqual(['eclipse', 'sombra-abissal'])
    // 2 variantes não despertam (D67)
    expect(
      awakeningCandidates(templateOf(kael), catalog.awakenings.values())
    ).toEqual([])
  })

  it('should be able to draw the awakening and one mission of each category', () => {
    const gaia = characterOf(roster, catalog, 'gaia')

    const progress = draw(gaia)!

    expect(progress.awakeningId.equals(awakeningByKey('cristal').id)).toBe(true)
    expect(
      progress.missions.map((m) => AWAKENING_MISSION_KINDS[m.kind].category)
    ).toEqual(['ACCUMULATIVE', 'REPEATED', 'MILESTONE'])
    expect(progress.missions.every((m) => m.progress === 0)).toBe(true)
    const pool = awakeningByKey('cristal').missions
    for (const mission of progress.missions) {
      expect(pool).toContainEqual({
        kind: mission.kind,
        threshold: mission.threshold,
      })
    }
  })

  it('should favor the awakening that matches the best stats', () => {
    const nox = characterOf(roster, catalog, 'nox')
    const abyss = awakeningByKey('sombra-abissal')
    const eclipse = awakeningByKey('eclipse')
    const stats = characterStats(nox, templateOf(nox))
    const expected =
      awakeningWeight(awakeningAffinity(abyss, stats)) /
      (awakeningWeight(awakeningAffinity(abyss, stats)) +
        awakeningWeight(awakeningAffinity(eclipse, stats)))
    expect(expected).toBeGreaterThan(0.5)

    let abyssCount = 0
    for (let seed = 1; seed <= 400; seed++) {
      if (draw(nox, seed)!.awakeningId.equals(abyss.id)) abyssCount += 1
    }

    // o mais compatível sai mais, e o outro nunca fica com zero
    expect(abyssCount / 400).toBeCloseTo(expected, 1)
    expect(abyssCount).toBeLessThan(400)
  })

  it('should not be able to draw below level 80, with 2 variants or without an awakening for the variant', () => {
    const young = makeRoster(makeAccount(), catalog, 79)

    expect(draw(characterOf(young, catalog, 'gaia'))).toBeNull()
    expect(draw(characterOf(roster, catalog, 'kael-vaz'))).toBeNull()
    expect(draw(characterOf(roster, catalog, 'ecko-nocthar'))).toBeNull()
  })

  it('should not be able to draw twice', () => {
    const gaia = characterOf(roster, catalog, 'gaia')
    gaia.startAwakening(draw(gaia)!)

    expect(draw(gaia)).toBeNull()
    expect(
      gaia.startAwakening(draw(characterOf(roster, catalog, 'nox'))!).isLeft()
    ).toBe(true)
  })

  it('should be able to lighten the missions of a pure blood character', () => {
    expect(pureBloodThreshold(100)).toBe(70)
    expect(pureBloodThreshold(15)).toBe(10)
    expect(pureBloodThreshold(1)).toBe(1)

    const nox = characterOf(roster, catalog, 'nox')
    const sombra = [...catalog.variants.values()].find(
      (v) => v.key === 'sombra'
    )!
    const pure = withTraits(nox, [
      makeTrait({
        key: 'sangue-de-sombra',
        source: TraitSource.TEMPLATE,
        variantId: sombra.id,
        effects: [{ type: 'LINEAGE_COST_MODIFIER', percent: -10 }],
      }),
    ])

    expect(isPureBlood(nox, templateOf(nox))).toBe(false)
    expect(isPureBlood(pure, templateOf(pure))).toBe(true)

    const normal = draw(nox, 3)!
    const light = draw(pure, 3)!
    const awakening: Awakening = catalog.awakenings.get(
      light.awakeningId.toValue()
    )!
    for (const mission of light.missions) {
      const base = awakening.missions.find((m) => m.kind === mission.kind)!
      expect(mission.threshold).toBe(pureBloodThreshold(base.threshold))
    }
    expect(normal.missions.length).toBe(3)
  })
})
