import { SeededRng } from '@/core/rng/seeded-rng'
import { Stat } from '@/domain/characters/enums/stat'
import { Passive } from '@/domain/characters/value-objects/passive'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { StatusType } from '@/domain/skills/enums/status-type'
import { makeBattleSnapshot } from 'test/factories/make-battle-snapshot'
import { FixedRng } from 'test/fakes/fixed-rng'
import { describe, expect, it } from 'vitest'
import { BattleSide } from '../enums/battle-enums'
import { BattleActionPayload } from '../value-objects/battle-action'
import { BattleSnapshot } from '../value-objects/battle-snapshot'
import { BattleEngine } from './battle-engine'

const passive = (override: Partial<Passive>): Passive => ({
  name: 'Teste',
  description: '',
  trigger: { type: 'ALWAYS' },
  effects: [],
  ...override,
})

/** Ataca o exposto da primeira linha ocupada do inimigo; skill de si mesmo vai em si. */
function attackFront(engine: BattleEngine, ref: string): BattleActionPayload {
  const me = engine.unit(ref)
  const enemySide =
    me.side === BattleSide.PLAYER ? BattleSide.OPPONENT : BattleSide.PLAYER
  const target = engine
    .aliveRefs(enemySide)
    .map((r) => engine.unit(r).position!)
    .sort((a, b) => a.row - b.row || a.column - b.column)[0]

  return {
    type: 'SKILL',
    skillKey: me.readySkills[0],
    targetSide: enemySide,
    target,
  }
}

function play(
  engine: BattleEngine,
  choose: (
    engine: BattleEngine,
    ref: string
  ) => BattleActionPayload = attackFront,
  maxTurns = 1000
) {
  let turns = 0
  for (
    let t = engine.nextTurn();
    t && turns < maxTurns;
    t = engine.nextTurn()
  ) {
    const result = engine.act(choose(engine, t.ref))
    if (result.isLeft()) throw result.value
    turns++
  }
}

/** Adversários mais rápidos e com escudo em si mesmos na primeira skill. */
function shieldedOpponents(snapshot: BattleSnapshot) {
  for (const unit of snapshot.opponent.units) {
    unit.profile = { ...unit.profile, SPEED: 300 }
    unit.skills[0] = {
      ...unit.skills[0],
      target: SkillTarget.SELF,
      range: null,
      area: SkillArea.SINGLE,
      baseHitChance: null,
      cooldown: 9,
      effects: [{ type: 'SHIELD', power: 1 }],
    }
  }
}

describe('Battle Engine: passives (D83)', () => {
  it('should be able to ignore shields with an ALWAYS passive (Ecko)', () => {
    const run = (withPassive: boolean) => {
      const snapshot = makeBattleSnapshot()
      shieldedOpponents(snapshot)
      if (withPassive) {
        snapshot.player.units[0].passive = passive({
          name: 'Apagar',
          effects: [{ type: 'IGNORE_SHIELD' }],
        })
      }
      const engine = new BattleEngine(snapshot, new FixedRng([0]))
      play(engine, attackFront, 40)

      return engine.events.find(
        (e) => e.type === 'DAMAGE' && e.ref === 'PLAYER:0'
      )
    }

    expect(run(false)).toMatchObject({ shieldAbsorbed: expect.any(Number) })
    expect(
      (run(false) as { shieldAbsorbed: number }).shieldAbsorbed
    ).toBeGreaterThan(0)
    expect(run(true)).toMatchObject({ shieldAbsorbed: 0 })
  })

  it('should be able to fire a periodic passive every N own turns (Lucky)', () => {
    const snapshot = makeBattleSnapshot()
    snapshot.player.units[0].passive = passive({
      name: 'Dobra do tempo',
      trigger: { type: 'PERIODIC', everyTurns: 3 },
      effects: [{ type: 'REDUCE_COOLDOWN', amount: 1, scope: 'RECHARGING' }],
    })
    const engine = new BattleEngine(snapshot, new SeededRng(4))

    play(engine)

    const turns = engine.events.filter(
      (e) => e.type === 'TURN' && e.ref === 'PLAYER:0'
    ).length
    const fired = engine.events.filter(
      (e) => e.type === 'PASSIVE' && e.ref === 'PLAYER:0'
    ).length

    expect(fired).toBe(Math.floor(turns / 3))
  })

  it('should be able to burn the attacker when hit (ON_HIT)', () => {
    const snapshot = makeBattleSnapshot()
    for (const unit of snapshot.opponent.units) {
      unit.passive = passive({
        name: 'Brasa interna',
        trigger: { type: 'ON_HIT' },
        effects: [
          {
            type: 'APPLY_STATUS',
            status: StatusType.DOT,
            target: 'ATTACKER',
            chance: 1,
          },
        ],
      })
    }
    const engine = new BattleEngine(snapshot, new FixedRng([0]))

    play(engine, attackFront, 4)

    const burned = engine.events.find(
      (e) => e.type === 'STATUS' && e.status === StatusType.DOT
    )
    expect(burned).toMatchObject({ result: 'APPLIED' })
    expect(burned && 'targetRef' in burned && burned.targetRef).toMatch(
      /^PLAYER/
    )
  })

  it('should be able to raise a stat only while HP is low (HP_BELOW)', () => {
    const snapshot = makeBattleSnapshot()
    snapshot.opponent.units[0].passive = passive({
      name: 'Última muralha',
      trigger: { type: 'HP_BELOW', percent: 50 },
      effects: [{ type: 'STAT_MODIFIER', stat: Stat.DEFENSE, percent: 50 }],
    })
    // sem custo, para a Defesa não cair pelo próprio Desgaste (skill none cobra Defesa, D107)
    snapshot.opponent.units[0].skills = snapshot.opponent.units[0].skills.map(
      (s) => ({ ...s, desgastePercent: 0 })
    )
    const engine = new BattleEngine(snapshot, new SeededRng(8))
    const healthyDefense = engine.unit('OPPONENT:0').stats.DEFENSE

    let checked = false
    for (let t = engine.nextTurn(); t; t = engine.nextTurn()) {
      engine.act(attackFront(engine, t.ref))
      const target = engine.unit('OPPONENT:0')
      if (target.alive && target.hp / target.maxHp < 0.5) {
        expect(target.stats.DEFENSE).toBeCloseTo(healthyDefense * 1.5)
        checked = true
        break
      }
    }

    expect(checked).toBe(true)
  })

  it('should not chain passives (a passive effect never fires another passive)', () => {
    const snapshot = makeBattleSnapshot()
    for (const unit of [...snapshot.player.units, ...snapshot.opponent.units]) {
      unit.passive = passive({
        name: 'Espelho',
        trigger: { type: 'ON_STATUS', status: StatusType.MARK },
        effects: [
          {
            type: 'APPLY_STATUS',
            status: StatusType.MARK,
            target: 'ATTACKER',
            chance: 1,
          },
        ],
      })
    }
    for (const unit of snapshot.player.units) {
      unit.skills[0] = {
        ...unit.skills[0],
        effects: [
          { type: 'DAMAGE', power: 0.8 },
          {
            type: 'APPLY_STATUS',
            status: StatusType.MARK,
            duration: 3,
            baseChance: 0.9,
          },
        ],
      }
    }
    const engine = new BattleEngine(snapshot, new FixedRng([0]))

    play(engine, attackFront, 1)

    const passives = engine.events.filter((e) => e.type === 'PASSIVE')
    expect(passives).toHaveLength(1)
  })
})
