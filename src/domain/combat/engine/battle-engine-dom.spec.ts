import { DomLevel } from '@/domain/characters/enums/dom-level'
import { DomPillar } from '@/domain/characters/enums/dom-pillar'
import { Stat } from '@/domain/characters/enums/stat'
import { computeStats } from '@/domain/characters/services/stat-calculator'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { makeBattleSnapshot } from 'test/factories/make-battle-snapshot'
import { FixedRng } from 'test/fakes/fixed-rng'
import { describe, expect, it } from 'vitest'
import { BattleSide } from '../enums/battle-enums'
import { domSkill, snapshotDom } from '../services/dom-skills'
import { BattleSnapshot } from '../value-objects/battle-snapshot'
import { BattleEngine } from './battle-engine'

const P0 = 'PLAYER:0'
const O0 = 'OPPONENT:0'

/** Avança Defendendo com todos até a vez de `ref`. */
function untilTurnOf(engine: BattleEngine, ref: string) {
  let turn = engine.nextTurn()!
  while (turn.ref !== ref) {
    engine.act({ type: 'DEFEND', timeout: true })
    turn = engine.nextTurn()!
  }
}

/** PLAYER:0 com os pilares dados (as skills únicas no fim da build) e todos no nível 50, de longe. */
function snapshotWith(
  pillars: Partial<Record<DomPillar, DomLevel>>
): BattleSnapshot {
  const snapshot = makeBattleSnapshot()
  for (const unit of [...snapshot.player.units, ...snapshot.opponent.units]) {
    unit.level = 50
    unit.skills = unit.skills.map((s) => ({ ...s, range: SkillRange.RANGED }))
  }
  const unit = snapshot.player.units[0]
  unit.dom = snapshotDom(pillars)!
  for (const pillar of Object.keys(pillars) as DomPillar[]) {
    if (pillars[pillar] === DomLevel.ADVANCED)
      unit.skills.push(domSkill(pillar))
  }
  return snapshot
}

const useDom = (
  engine: BattleEngine,
  pillar: DomPillar,
  targetSide: BattleSide = BattleSide.PLAYER
) =>
  engine.act({
    type: 'SKILL',
    skillKey: domSkill(pillar).key,
    targetSide,
    target: { row: 0, column: 0 },
  })

const attackP0 = (engine: BattleEngine) =>
  engine.act({
    type: 'SKILL',
    skillKey: `${O0}-skill-0`,
    targetSide: BattleSide.PLAYER,
    target: { row: 0, column: 0 },
  })

describe('Battle Engine (DOM)', () => {
  it('should be able to raise the stats of the pillars after the caps', () => {
    const sut = new BattleEngine(
      snapshotWith({ BODY: DomLevel.INTERMEDIATE }),
      new FixedRng([0])
    )

    const unit = makeBattleSnapshot().player.units[0]
    const expected = computeStats({
      profile: unit.profile,
      level: 50,
      freePoints: unit.freePoints,
      domPercents: { SPEED: 6, ATTACK: 4 },
    })

    expect(sut.unit(P0).stats[Stat.SPEED]).toBe(expected.SPEED)
    expect(sut.unit(P0).stats[Stat.ATTACK]).toBe(expected.ATTACK)
    expect(sut.unit('PLAYER:1').stats[Stat.ATTACK]).toBeLessThan(
      expected.ATTACK
    )
  })

  it('should be able to use a unique skill only once per battle, at no cost', () => {
    const sut = new BattleEngine(
      snapshotWith({ BODY: DomLevel.ADVANCED }),
      new FixedRng([0])
    )
    untilTurnOf(sut, P0)

    const first = useDom(sut, DomPillar.BODY)
    untilTurnOf(sut, P0)
    const again = useDom(sut, DomPillar.BODY)

    expect(first.isRight()).toBe(true)
    expect(
      first.isRight() &&
        first.value.find((e) => e.type === 'DESGASTE' && e.ref === P0)
    ).toMatchObject({ selfDamage: 0 })
    expect(again.isLeft()).toBe(true)
    expect(sut.unit(P0).readySkills).not.toContain('dom:body')
  })

  it('should be able to nullify every hit until the next turn with Indestrutível', () => {
    const sut = new BattleEngine(
      snapshotWith({ BODY: DomLevel.ADVANCED }),
      new FixedRng([0])
    )
    untilTurnOf(sut, P0)
    useDom(sut, DomPillar.BODY)
    const hp = sut.unit(P0).hp

    untilTurnOf(sut, O0)
    const blocked = attackP0(sut)

    expect(sut.unit(P0).invulnerable).toBe(true)
    expect(sut.unit(P0).hp).toBe(hp)
    expect(
      blocked.isRight() &&
        blocked.value.find((e) => e.type === 'DAMAGE' && e.targetRef === P0)
    ).toMatchObject({ amount: 0, shieldAbsorbed: 0 })

    untilTurnOf(sut, P0)
    expect(sut.unit(P0).invulnerable).toBe(false)
    sut.act({ type: 'DEFEND', timeout: true })
    untilTurnOf(sut, O0)
    attackP0(sut)

    expect(sut.unit(P0).hp).toBeLessThan(hp)
  })

  it('should be able to stun for 2 turns with Vidente, by the target Mind', () => {
    const snapshot = snapshotWith({ MIND: DomLevel.ADVANCED })
    const sut = new BattleEngine(snapshot, new FixedRng([0.5]))
    untilTurnOf(sut, P0)

    useDom(sut, DomPillar.MIND, BattleSide.OPPONENT)
    const skips: string[] = []
    for (let i = 0; i < 16 && skips.length < 2; i++) {
      const before = sut.events.length
      sut.nextTurn()
      sut.act({ type: 'DEFEND', timeout: true })
      for (const e of sut.events.slice(before)) {
        if (e.type === 'SKIP') skips.push(e.ref)
      }
    }

    expect(skips).toEqual([O0, O0])

    // alvo com Mente avançada: 30%, e o sorteio de 0,5 não passa
    const guarded = snapshotWith({ MIND: DomLevel.ADVANCED })
    guarded.opponent.units[0].dom = snapshotDom({ MIND: DomLevel.ADVANCED })!
    const other = new BattleEngine(guarded, new FixedRng([0.5]))
    untilTurnOf(other, P0)
    const resisted = useDom(other, DomPillar.MIND, BattleSide.OPPONENT)

    expect(
      resisted.isRight() && resisted.value.find((e) => e.type === 'STATUS')
    ).toMatchObject({ targetRef: O0, status: 'STUN', result: 'RESISTED' })
  })

  it('should be able to lower every stat of every enemy with Rei', () => {
    const sut = new BattleEngine(
      snapshotWith({ AURA: DomLevel.ADVANCED }),
      new FixedRng([0])
    )
    untilTurnOf(sut, P0)
    const attack = sut.unit(O0).stats[Stat.ATTACK]

    const done = useDom(sut, DomPillar.AURA, BattleSide.OPPONENT)
    const added =
      done.isRight() &&
      done.value.filter(
        (e) =>
          e.type === 'MODIFIER' && e.percent === -15 && e.result === 'ADDED'
      )

    expect(added && added.length).toBe(4 * 7)
    expect(sut.unit(O0).stats[Stat.ATTACK]).toBeCloseTo(attack * 0.85)
  })

  it('should be able to heal 50% of max HP with Resiliente', () => {
    const sut = new BattleEngine(
      snapshotWith({ HEART: DomLevel.ADVANCED }),
      new FixedRng([0])
    )
    untilTurnOf(sut, P0)

    const preview = sut.previewSkill(P0, {
      type: 'SKILL',
      skillKey: 'dom:heart',
      targetSide: BattleSide.PLAYER,
      target: { row: 0, column: 0 },
    })

    expect(preview.isRight() && preview.value.hits[0].effects[0]).toEqual({
      type: 'HEAL',
      amount: Math.round(sut.unit(P0).maxHp * 0.5),
    })
  })
})
