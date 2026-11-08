import { describe, expect, it } from 'vitest'
import { DomFeat } from '@/domain/characters/value-objects/dom-state'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { StatusType } from '@/domain/skills/enums/status-type'
import { BattleEvent } from '../engine/battle-events'
import { BattleSide } from '../enums/battle-enums'
import { domBattleFeats, DomFeatsEnd, DomFeatsInput } from './dom-feats'

const [P0, P1, P2, P3] = [0, 1, 2, 3].map((i) => `PLAYER:${i}`)
const [O0, O1, O2, O3] = [0, 1, 2, 3].map((i) => `OPPONENT:${i}`)

const turn = (ref: string, round: number, extra = {}): BattleEvent => ({
  type: 'TURN',
  ref,
  round,
  tick: round,
  ...extra,
})
const skill = (ref: string, skillKey = 'single'): BattleEvent => ({
  type: 'SKILL',
  ref,
  skillKey,
  potency: 1,
})
const hit = (
  ref: string,
  targetRef: string,
  amount: number,
  extra: Partial<Extract<BattleEvent, { type: 'DAMAGE' }>> = {}
): BattleEvent => ({
  type: 'DAMAGE',
  ref,
  targetRef,
  amount,
  shieldAbsorbed: 0,
  hpLeft: 100,
  ...extra,
})
const defeated = (ref: string): BattleEvent => ({ type: 'DEFEATED', ref })
const roundEnd = (round: number): BattleEvent => ({ type: 'ROUND_END', round })

function feats(
  events: BattleEvent[],
  override: Partial<DomFeatsInput> & {
    ends?: Record<string, Partial<DomFeatsEnd>>
    levels?: Record<string, number>
  } = {}
): Map<string, DomFeat[]> {
  const { ends = {}, levels = {}, ...rest } = override
  return domBattleFeats({
    events,
    side: BattleSide.PLAYER,
    units: [P0, P1, P2, P3, O0, O1, O2, O3].map((ref) => ({
      ref,
      level: levels[ref] ?? 50,
    })),
    won: true,
    end: (ref) => ({ alive: true, hp: 1000, maxHp: 1000, ...ends[ref] }),
    areaOf: (_, key) => (key === 'area' ? SkillArea.LINE : SkillArea.SINGLE),
    ...rest,
  })
}

const has = (result: Map<string, DomFeat[]>, ref: string, feat: string) =>
  result.get(ref)!.some((f) => `${f.pillar}/${f.role}` === feat)

describe('Dom Battle Feats', () => {
  it('should not be able to give any feat without winning', () => {
    const result = feats(
      [
        { type: 'MISS', ref: O0, targetRef: P0 },
        { type: 'MISS', ref: O0, targetRef: P0 },
        { type: 'MISS', ref: O0, targetRef: P0 },
      ],
      { won: false }
    )

    expect(result.get(P0)).toEqual([])
  })

  it('should be able to give Mind / tank for dodging 3 attacks', () => {
    const miss: BattleEvent = { type: 'MISS', ref: O0, targetRef: P0 }

    expect(has(feats([miss, miss]), P0, 'MIND/TANK')).toBe(false)
    expect(has(feats([miss, miss, miss]), P0, 'MIND/TANK')).toBe(true)
  })

  it('should be able to give Mind / damage for 3 skills that hit a Marked or Exposed target', () => {
    const marked = { targetStatuses: [StatusType.MARK] }
    const result = feats([
      turn(P0, 1),
      skill(P0, 'area'),
      hit(P0, O0, 50, marked),
      hit(P0, O1, 50, marked),
      turn(P0, 2),
      skill(P0),
      hit(P0, O0, 50, { targetStatuses: [StatusType.EXPOSE] }),
      turn(P0, 3),
      skill(P0),
      hit(P0, O0, 50),
    ])
    expect(has(result, P0, 'MIND/DAMAGE')).toBe(false)

    const more = feats([
      turn(P0, 1),
      skill(P0),
      hit(P0, O0, 50, marked),
      turn(P0, 2),
      skill(P0),
      hit(P0, O0, 50, marked),
      turn(P0, 3),
      skill(P0),
      hit(P0, O0, 50, marked),
    ])
    expect(has(more, P0, 'MIND/DAMAGE')).toBe(true)
  })

  it('should be able to give Mind / support when a buffed ally kills before the buffer acts again', () => {
    const buff: BattleEvent = {
      type: 'MODIFIER',
      ref: P0,
      targetRef: P1,
      stat: 'ATTACK',
      percent: 10,
      result: 'ADDED',
    }
    const result = feats([
      turn(P0, 1),
      buff,
      turn(P1, 1),
      skill(P1),
      hit(P1, O0, 500),
      defeated(O0),
    ])
    expect(has(result, P0, 'MIND/SUPPORT')).toBe(true)

    const late = feats([
      turn(P0, 1),
      buff,
      turn(P0, 2),
      turn(P1, 2),
      skill(P1),
      hit(P1, O0, 500),
      defeated(O0),
    ])
    expect(has(late, P0, 'MIND/SUPPORT')).toBe(false)
  })

  it('should be able to give Mind / control for debuffing every live enemy in a round without being hit', () => {
    const debuff = (targetRef: string): BattleEvent => ({
      type: 'STATUS',
      ref: P0,
      targetRef,
      status: StatusType.MARK,
      result: 'APPLIED',
    })
    const all = [O0, O1, O2, O3].map(debuff)

    expect(
      has(feats([turn(P0, 1), ...all, roundEnd(1)]), P0, 'MIND/CONTROL')
    ).toBe(true)
    expect(
      has(
        feats([turn(P0, 1), ...all.slice(0, 3), roundEnd(1)]),
        P0,
        'MIND/CONTROL'
      )
    ).toBe(false)
    expect(
      has(
        feats([turn(P0, 1), ...all, hit(O0, P0, 10), roundEnd(1)]),
        P0,
        'MIND/CONTROL'
      )
    ).toBe(false)
  })

  it('should be able to give Heart / damage for the final blow below 20% of HP', () => {
    const events = [
      ...[O0, O1, O2].map(defeated),
      turn(P0, 1),
      skill(P0),
      hit(P0, O3, 500),
      defeated(O3),
    ]

    expect(
      has(feats(events, { ends: { [P0]: { hp: 150 } } }), P0, 'HEART/DAMAGE')
    ).toBe(true)
    expect(
      has(feats(events, { ends: { [P0]: { hp: 250 } } }), P0, 'HEART/DAMAGE')
    ).toBe(false)
  })

  it('should be able to give Heart / tank for being the most attacked in 5 rounds and surviving', () => {
    const events = [1, 2, 3, 4, 5].flatMap((round) => [
      turn(O0, round),
      hit(O0, P0, 10),
      hit(O0, P0, 10),
      hit(O1, P1, 10),
      roundEnd(round),
    ])

    expect(has(feats(events), P0, 'HEART/TANK')).toBe(true)
    expect(has(feats(events), P1, 'HEART/TANK')).toBe(false)
    expect(
      has(feats(events, { ends: { [P0]: { alive: false } } }), P0, 'HEART/TANK')
    ).toBe(false)
  })

  it('should be able to give Heart / support for healing allies by 100% of own max HP', () => {
    const heal = (amount: number): BattleEvent => ({
      type: 'HEAL',
      ref: P0,
      targetRef: P1,
      amount,
    })
    const self: BattleEvent = {
      type: 'HEAL',
      ref: P0,
      targetRef: P0,
      amount: 500,
    }

    expect(has(feats([heal(600), heal(400)]), P0, 'HEART/SUPPORT')).toBe(true)
    expect(has(feats([heal(600), self]), P0, 'HEART/SUPPORT')).toBe(false)
  })

  it('should be able to give Heart / control to the survivors after being 2 down', () => {
    const result = feats(
      [defeated(P0), defeated(P1), ...[O0, O1, O2, O3].map(defeated)],
      { ends: { [P0]: { alive: false }, [P1]: { alive: false } } }
    )

    expect(has(result, P2, 'HEART/CONTROL')).toBe(true)
    expect(has(result, P0, 'HEART/CONTROL')).toBe(false)
  })

  it('should be able to give Body / damage for 2 single-target kills in the same round', () => {
    const kill = (target: string, key = 'single') => [
      skill(P0, key),
      hit(P0, target, 500),
      defeated(target),
    ]

    expect(
      has(
        feats([turn(P0, 1), ...kill(O0), turn(P0, 1), ...kill(O1)]),
        P0,
        'BODY/DAMAGE'
      )
    ).toBe(true)
    expect(
      has(
        feats([turn(P0, 1), ...kill(O0), turn(P0, 2), ...kill(O1)]),
        P0,
        'BODY/DAMAGE'
      )
    ).toBe(false)
    expect(
      has(
        feats([turn(P0, 1), ...kill(O0, 'area'), turn(P0, 1), ...kill(O1)]),
        P0,
        'BODY/DAMAGE'
      )
    ).toBe(false)
  })

  it('should be able to give Body / tank for taking more than half of the enemy damage', () => {
    const result = feats([
      hit(O0, P0, 300, { shieldAbsorbed: 100 }),
      hit(O0, P1, 300),
      { type: 'DOT', ref: P2, amount: 100 },
    ])

    // 400 de 800: exatamente a metade não basta
    expect(has(result, P0, 'BODY/TANK')).toBe(false)

    const more = feats([
      hit(O0, P0, 301, { shieldAbsorbed: 100 }),
      hit(O0, P1, 400),
    ])
    expect(has(more, P0, 'BODY/TANK')).toBe(true)
  })

  it('should be able to give Body / support when his shield saves 2 different allies', () => {
    const shield = (targetRef: string): BattleEvent => ({
      type: 'SHIELD',
      ref: P0,
      targetRef,
      amount: 300,
    })
    // sem o escudo, 280 + 200 = 480 ≥ 200 + 80: teria caído
    const saved = (targetRef: string) =>
      hit(O0, targetRef, 200, { shieldAbsorbed: 280, hpLeft: 80 })

    const result = feats([
      turn(P0, 1),
      shield(P1),
      shield(P2),
      saved(P1),
      saved(P2),
      roundEnd(1),
    ])
    expect(has(result, P0, 'BODY/SUPPORT')).toBe(true)

    const notLethal = feats([
      turn(P0, 1),
      shield(P1),
      shield(P2),
      hit(O0, P1, 50, { shieldAbsorbed: 100, hpLeft: 500 }),
      saved(P2),
      roundEnd(1),
    ])
    expect(has(notLethal, P0, 'BODY/SUPPORT')).toBe(false)
  })

  it('should be able to give Body / control for keeping one enemy controlled for 2 turns in a row', () => {
    const stun: BattleEvent = {
      type: 'STATUS',
      ref: P0,
      targetRef: O0,
      status: StatusType.STUN,
      result: 'APPLIED',
    }
    const root: BattleEvent = {
      type: 'STATUS',
      ref: P0,
      targetRef: O0,
      status: StatusType.ROOT,
      result: 'APPLIED',
    }

    const result = feats([
      turn(P0, 1),
      stun,
      turn(O0, 1),
      { type: 'SKIP', ref: O0, reason: 'STUN' },
      turn(P0, 2),
      root,
      turn(O0, 2, { statuses: [StatusType.ROOT] }),
    ])
    expect(has(result, P0, 'BODY/CONTROL')).toBe(true)

    const broken = feats([
      turn(P0, 1),
      stun,
      turn(O0, 1),
      { type: 'SKIP', ref: O0, reason: 'STUN' },
      turn(O0, 2),
      turn(P0, 3),
      root,
      turn(O0, 3, { statuses: [StatusType.ROOT] }),
    ])
    expect(has(broken, P0, 'BODY/CONTROL')).toBe(false)
  })

  it('should be able to give the Aura feats against higher levels', () => {
    const levels = { [O0]: 60, [O1]: 60, [O2]: 60, [O3]: 60 }
    const result = feats(
      [turn(P0, 1), skill(P0), hit(P0, O0, 500), defeated(O0)],
      { levels, ends: { [P3]: { alive: false } } }
    )

    expect(has(result, P0, 'AURA/DAMAGE')).toBe(true)
    expect(has(result, P1, 'AURA/TANK')).toBe(true)
    expect(has(result, P3, 'AURA/TANK')).toBe(false)

    const allAlive = feats([], { levels })
    expect(has(allAlive, P2, 'AURA/SUPPORT')).toBe(true)
    expect(has(feats([]), P2, 'AURA/SUPPORT')).toBe(false)
  })

  it('should be able to give Aura / control for 3 debuffs on an enemy that then loses a turn', () => {
    const debuff = (stat: 'ATTACK' | 'SPEED' | 'WILL'): BattleEvent => ({
      type: 'MODIFIER',
      ref: P0,
      targetRef: O0,
      stat,
      percent: -10,
      result: 'ADDED',
    })
    const skip: BattleEvent = { type: 'SKIP', ref: O0, reason: 'STUN' }

    expect(
      has(
        feats([
          debuff('ATTACK'),
          debuff('SPEED'),
          debuff('WILL'),
          turn(O0, 1),
          skip,
        ]),
        P0,
        'AURA/CONTROL'
      )
    ).toBe(true)
    expect(
      has(
        feats([
          debuff('ATTACK'),
          debuff('SPEED'),
          turn(O0, 1),
          skip,
          debuff('WILL'),
        ]),
        P0,
        'AURA/CONTROL'
      )
    ).toBe(false)
  })
})
