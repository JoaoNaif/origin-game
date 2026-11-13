import { describe, expect, it } from 'vitest'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import {
  makeBattleSnapshot,
  makeSnapshotSkill,
} from 'test/factories/make-battle-snapshot'
import { FixedRng } from 'test/fakes/fixed-rng'
import { BattleSide } from '../enums/battle-enums'
import { BattleRules } from '../value-objects/battle-snapshot'
import { BattleEngine } from './battle-engine'

/** Foto padrão com a primeira skill do `PLAYER:0` virando cura num aliado, e as regras do evento. */
function snapshotWith(rules?: BattleRules) {
  const snapshot = makeBattleSnapshot()
  snapshot.player.units[0].skills[0] = {
    ...makeSnapshotSkill('curar'),
    target: SkillTarget.ALLY,
    range: null,
    baseHitChance: null,
    effects: [{ type: 'HEAL', power: 2 }],
  }
  return rules ? { ...snapshot, rules } : snapshot
}

function healPreview(engine: BattleEngine): number {
  let turn = engine.nextTurn()!
  while (turn.ref !== 'PLAYER:0') {
    engine.act({ type: 'DEFEND', timeout: true })
    turn = engine.nextTurn()!
  }
  const preview = engine.previewSkill('PLAYER:0', {
    type: 'SKILL',
    skillKey: 'curar',
    targetSide: BattleSide.PLAYER,
    target: { row: 0, column: 0 },
  })
  if (preview.isLeft()) throw preview.value
  const effect = preview.value.hits[0].effects[0]
  return effect.type === 'HEAL' ? effect.amount : -1
}

describe('Battle Engine (regras do evento, D155)', () => {
  it('should be able to heal normally without event rules', () => {
    const sut = new BattleEngine(snapshotWith(), new FixedRng([0]))

    expect(healPreview(sut)).toBeGreaterThan(0)
  })

  it('should not be able to heal with the no healing rule', () => {
    const sut = new BattleEngine(
      snapshotWith({ noHealing: true }),
      new FixedRng([0])
    )

    expect(healPreview(sut)).toBe(0)
  })

  it('should be able to give every unit the same speed', () => {
    const sut = new BattleEngine(
      snapshotWith({ equalSpeed: true }),
      new FixedRng([0])
    )
    const refs = [
      ...sut.aliveRefs(BattleSide.PLAYER),
      ...sut.aliveRefs(BattleSide.OPPONENT),
    ]

    // mesma Velocidade = todas as barras andam igual até a primeira vez
    sut.nextTurn()
    const gauges = new Set(
      refs.filter((ref) => ref !== sut.currentRef).map((ref) => sut.gauge(ref))
    )
    expect(gauges.size).toBe(1)
  })

  it('should be able to start the exhaustion earlier', () => {
    const play = (rules?: BattleRules) => {
      const engine = new BattleEngine(snapshotWith(rules), new FixedRng([0]))
      // passa da rodada 1 para a 2 Defendendo com todos
      while (engine.round < 2) {
        engine.nextTurn()
        engine.act({ type: 'DEFEND', timeout: true })
      }
      return healPreview(engine)
    }

    // na rodada 2, com a Exaustão depois da 0, a cura já rende menos (−5% por rodada)
    expect(play({ exhaustionAfterRound: 0 })).toBeLessThan(play())
  })
})
