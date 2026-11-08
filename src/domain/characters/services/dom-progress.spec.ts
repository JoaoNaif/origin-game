import { beforeEach, describe, expect, it } from 'vitest'
import { DomLevel } from '../enums/dom-level'
import { DomPillar } from '../enums/dom-pillar'
import { DomRole } from '../enums/dom-role'
import { DomFeat, DomState, emptyDomState } from '../value-objects/dom-state'
import {
  domPillarPoints,
  domRolePoints,
  recordDomBattle,
  selectDomFeats,
} from './dom-progress'
import { domStatPercents, domThreshold } from './dom-rules'

const { MIND, HEART, BODY, AURA } = DomPillar
const { DAMAGE, TANK, SUPPORT, CONTROL } = DomRole

const feat = (pillar: DomPillar, role: DomRole): DomFeat => ({ pillar, role })

/** Joga `count` batalhas de peso 1 com os mesmos feitos. */
function play(
  state: DomState,
  count: number,
  feats: DomFeat[],
  { weight = 1, hasVariant = true } = {}
) {
  const changes = []
  for (let i = 0; i < count; i++) {
    const result = recordDomBattle(state, { weight, feats, hasVariant })
    state = result.state
    changes.push(...result.changes)
  }
  return { state, changes }
}

describe('Dom Progress', () => {
  let sut: DomState

  beforeEach(() => {
    sut = emptyDomState()
  })

  it('should be able to reach the basic level with 8 points in the window', () => {
    const before = play(sut, 7, [feat(MIND, TANK)])
    expect(before.state.pillars.MIND).toBeUndefined()

    const after = play(before.state, 1, [feat(MIND, TANK)])

    expect(after.state.pillars.MIND).toBe(DomLevel.BASIC)
    expect(after.changes).toEqual([
      { pillar: MIND, from: null, to: DomLevel.BASIC },
    ])
  })

  it('should be able to lower the thresholds by 0.8 without a variant', () => {
    expect(domThreshold(DomLevel.BASIC, false)).toBe(6)
    expect(domThreshold(DomLevel.INTERMEDIATE, false)).toBe(16)
    expect(domThreshold(DomLevel.ADVANCED, false)).toBe(36)

    const { state } = play(sut, 6, [feat(BODY, DAMAGE)], { hasVariant: false })

    expect(state.pillars.BODY).toBe(DomLevel.BASIC)
  })

  it('should be able to rise only one level per battle', () => {
    const { state, changes } = play(sut, 20, [feat(HEART, SUPPORT)])

    expect(state.pillars.HEART).toBe(DomLevel.INTERMEDIATE)
    expect(changes.map((c) => c.to)).toEqual([
      DomLevel.BASIC,
      DomLevel.INTERMEDIATE,
    ])
  })

  it('should be able to require 3 roles with 8 points for the advanced level', () => {
    const oneRole = play(sut, 60, [feat(AURA, DAMAGE)])
    expect(domPillarPoints(oneRole.state.history, AURA)).toBe(60)
    expect(oneRole.state.pillars.AURA).toBe(DomLevel.INTERMEDIATE)

    let state = oneRole.state
    state = play(state, 8, [feat(AURA, TANK)]).state
    expect(state.pillars.AURA).toBe(DomLevel.INTERMEDIATE)
    state = play(state, 8, [feat(AURA, CONTROL)]).state

    expect(domRolePoints(state.history, AURA)).toMatchObject({
      DAMAGE: 60,
      TANK: 8,
      CONTROL: 8,
    })
    expect(state.pillars.AURA).toBe(DomLevel.ADVANCED)
  })

  it('should be able to keep one feat per pillar, in the role with fewer points', () => {
    const { state } = play(sut, 3, [feat(MIND, DAMAGE)])

    expect(
      selectDomFeats(state.history, [
        feat(MIND, DAMAGE),
        feat(MIND, SUPPORT),
        feat(BODY, TANK),
      ])
    ).toEqual([feat(MIND, SUPPORT), feat(BODY, TANK)])
  })

  it('should be able to count the feats with the weight of the mode', () => {
    const { state } = play(sut, 10, [feat(MIND, TANK)], { weight: 0.3 })

    expect(domPillarPoints(state.history, MIND)).toBe(3)
    expect(state.pillars.MIND).toBeUndefined()
  })

  it('should not be able to count a battle with weight 0 (friendly)', () => {
    const result = recordDomBattle(sut, {
      weight: 0,
      feats: [feat(MIND, TANK)],
      hasVariant: true,
    })

    expect(result.state).toBe(sut)
  })

  it('should be able to keep the window at 150 of weight, merging battles without feats', () => {
    let { state } = play(sut, 10, [feat(MIND, TANK)])
    state = play(state, 200, []).state

    expect(state.history).toEqual([{ weight: 150, feats: [] }])
    expect(domPillarPoints(state.history, MIND)).toBe(0)
  })

  it('should be able to drop one level below 70% of the threshold, checked every 25 of weight', () => {
    const reached = play(sut, 8, [feat(MIND, TANK)])
    expect(reached.state.pillars.MIND).toBe(DomLevel.BASIC)

    // 8 pontos seguem na janela até sair do peso de 150: a perda só vem quando eles saem
    const kept = play(reached.state, 140, [])
    expect(kept.state.pillars.MIND).toBe(DomLevel.BASIC)

    // os pontos saem da janela no peso 158; a conferência seguinte é no 175
    const lost = play(kept.state, 27, [])

    expect(lost.state.pillars.MIND).toBeUndefined()
    expect(lost.changes).toEqual([
      { pillar: MIND, from: DomLevel.BASIC, to: null },
    ])
  })

  it('should be able to give the stats of each pillar, adding pillars on the same stat', () => {
    expect(
      domStatPercents({ BODY: DomLevel.BASIC, AURA: DomLevel.ADVANCED })
    ).toEqual({ SPEED: 3, ATTACK: 6, WILL: 6 })
  })
})
