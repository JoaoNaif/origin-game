import { CharacterClass } from '@/domain/characters/enums/character-class'
import { Lineage } from '@/domain/characters/enums/lineage'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import {
  makeBattleSnapshot,
  makeSnapshotSkill,
} from 'test/factories/make-battle-snapshot'
import { FixedRng } from 'test/fakes/fixed-rng'
import { describe, expect, it } from 'vitest'
import { BattleSide } from '../enums/battle-enums'
import { BattleActionPayload } from '../value-objects/battle-action'
import { BattleEngine } from './battle-engine'

/** Avança Defendendo com todos até a vez de `ref`. */
function untilTurnOf(engine: BattleEngine, ref: string) {
  let turn = engine.nextTurn()!
  while (turn.ref !== ref) {
    engine.act({ type: 'DEFEND' })
    turn = engine.nextTurn()!
  }
}

describe('Battle Engine (recuperação, troca e Interceptar)', () => {
  it('should be able to swap only with an adjacent ally (D120)', () => {
    // PLAYER:0 (0,0), PLAYER:1 (2,0), PLAYER:2 (1,1): o 0 não é adjacente ao 1 nem ao 2
    const sut = new BattleEngine(makeBattleSnapshot(), new FixedRng([0]))
    untilTurnOf(sut, 'PLAYER:2')

    const far = sut.act({ type: 'SWAP', withRef: 'PLAYER:0' })
    const near = sut.act({ type: 'SWAP', withRef: 'PLAYER:3' })

    expect(far.isLeft()).toBe(true)
    expect(near.isRight()).toBe(true)
  })

  it('should be able to relieve half of the desgaste, max HP included, with a recovery skill', () => {
    const snapshot = makeBattleSnapshot()
    const unit = snapshot.player.units[0]
    unit.lineages = [Lineage.FUNDAMENTAL]
    unit.skills[0] = {
      ...makeSnapshotSkill('PLAYER:0-fundamental'),
      lineage: Lineage.FUNDAMENTAL,
      desgastePercent: 8,
    }
    unit.skills[1] = {
      ...makeSnapshotSkill('PLAYER:0-recover'),
      target: SkillTarget.SELF,
      range: null,
      baseHitChance: null,
      effects: [{ type: 'RECOVER' }],
    }
    const sut = new BattleEngine(snapshot, new FixedRng([0]))
    const fullMaxHp = sut.unit('PLAYER:0').maxHp

    untilTurnOf(sut, 'PLAYER:0')
    sut.act({
      type: 'SKILL',
      skillKey: 'PLAYER:0-fundamental',
      targetSide: BattleSide.OPPONENT,
      target: { row: 0, column: 0 },
    })
    const lost = fullMaxHp - sut.unit('PLAYER:0').maxHp

    untilTurnOf(sut, 'PLAYER:0')
    const done = sut.act({
      type: 'SKILL',
      skillKey: 'PLAYER:0-recover',
      targetSide: BattleSide.PLAYER,
      target: { row: 0, column: 0 },
    })

    expect(lost).toBeGreaterThan(0)
    expect(fullMaxHp - sut.unit('PLAYER:0').maxHp).toBeCloseTo(lost / 2)
    expect(done.isRight() && done.value.some((e) => e.type === 'RECOVER')).toBe(
      true
    )
  })

  it('should be able to preview the hit a guardian will intercept', () => {
    const snapshot = makeBattleSnapshot()
    // Guardião em (1,1), adjacente ao alvo em (1,2)
    snapshot.opponent.units[2].characterClass = CharacterClass.GUARDIAN
    snapshot.player.units[0].skills[0] = {
      ...snapshot.player.units[0].skills[0],
      range: SkillRange.RANGED,
    }
    const sut = new BattleEngine(snapshot, new FixedRng([0]))
    untilTurnOf(sut, 'PLAYER:0')
    const payload: BattleActionPayload = {
      type: 'SKILL',
      skillKey: snapshot.player.units[0].skills[0].key,
      targetSide: BattleSide.OPPONENT,
      target: { row: 1, column: 2 },
    }

    const preview = sut.previewSkill('PLAYER:0', payload)
    const before = sut.events.length
    const again = sut.previewSkill('PLAYER:0', payload)

    expect(preview.isRight() && preview.value.hits[0].ref).toBe('OPPONENT:2')
    // a prévia não gasta o Interceptar da rodada
    expect(again.isRight() && again.value.hits[0].ref).toBe('OPPONENT:2')
    expect(sut.events.length).toBe(before)

    const done = sut.act(payload)
    expect(
      done.isRight() && done.value.some((e) => e.type === 'INTERCEPT')
    ).toBe(true)
  })
})
