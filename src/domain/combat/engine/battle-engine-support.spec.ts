import { SeededRng } from '@/core/rng/seeded-rng'
import { Stat } from '@/domain/characters/enums/stat'
import { StatusType } from '@/domain/skills/enums/status-type'
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
    engine.act({ type: 'DEFEND', timeout: true })
    turn = engine.nextTurn()!
  }
}

describe('Battle Engine (recuperação, troca e Interceptar)', () => {
  it('should not be able to defend with a skill ready, only when the time runs out (D38)', () => {
    const sut = new BattleEngine(makeBattleSnapshot(), new FixedRng([0]))
    sut.nextTurn()

    expect(sut.act({ type: 'DEFEND' }).isLeft()).toBe(true)
    expect(sut.act({ type: 'DEFEND', timeout: true }).isRight()).toBe(true)
  })

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

describe('Battle Engine (cobertura e meio turno, D123)', () => {
  const ranged = (key: string) => ({
    ...makeSnapshotSkill(key),
    range: SkillRange.RANGED,
    baseHitChance: 1,
    effects: [{ type: 'DAMAGE' as const, power: 1 }],
  })

  it('should be able to cut a single ranged hit on who is behind someone to 70%', () => {
    // OPPONENT:2 em (1,1) está na frente de OPPONENT:3 em (1,2)
    const snapshot = makeBattleSnapshot()
    snapshot.player.units[0].skills[0] = ranged('tiro')
    snapshot.player.units[0].skills[1] = {
      ...ranged('flanco'),
      range: SkillRange.FLANK,
    }
    const sut = new BattleEngine(snapshot, new FixedRng([0]))
    untilTurnOf(sut, 'PLAYER:0')
    const damageOn = (skillKey: string, column: number) => {
      const preview = sut.previewSkill('PLAYER:0', {
        type: 'SKILL',
        skillKey,
        targetSide: BattleSide.OPPONENT,
        target: { row: 1, column },
      })
      if (preview.isLeft()) throw preview.value
      const effect = preview.value.hits[0].effects[0]
      return effect.type === 'DAMAGE' ? effect.amount : 0
    }

    const front = damageOn('tiro', 1)
    const behind = damageOn('tiro', 2)
    const flank = damageOn('flanco', 2)

    expect(behind / front).toBeCloseTo(0.7, 1)
    // o flanco é a ferramenta para chegar no fundo: sem cobertura
    expect(flank).toBe(front)
  })

  it('should be able to move for half a turn without ticking the cooldowns', () => {
    const snapshot = makeBattleSnapshot()
    // ninguém de corpo a corpo na frente do outro lado: ninguém Engajado (D129)
    for (const u of snapshot.opponent.units)
      u.characterClass = CharacterClass.MARKSMAN
    snapshot.player.units[0].skills[0] = {
      ...makeSnapshotSkill('PLAYER:0-cd'),
      cooldown: 2,
    }
    const sut = new BattleEngine(snapshot, new FixedRng([0]))
    untilTurnOf(sut, 'PLAYER:0')
    sut.act({
      type: 'SKILL',
      skillKey: 'PLAYER:0-cd',
      targetSide: BattleSide.OPPONENT,
      target: { row: 0, column: 0 },
    })
    untilTurnOf(sut, 'PLAYER:0')
    const before = sut.gauge('PLAYER:0')

    sut.act({ type: 'MOVE', to: { row: 0, column: 1 } })

    expect(sut.gauge('PLAYER:0')).toBe(before + 500)
    expect(sut.unit('PLAYER:0').readySkills).not.toContain('PLAYER:0-cd')
  })

  it('should be able to swap for half a turn for both, with no lost action', () => {
    // PLAYER:2 (1,1) e PLAYER:3 (1,2) são adjacentes; sem corpo a corpo na frente do outro lado (D129)
    const snapshot = makeBattleSnapshot()
    for (const u of snapshot.opponent.units)
      u.characterClass = CharacterClass.MARKSMAN
    const sut = new BattleEngine(snapshot, new FixedRng([0]))
    untilTurnOf(sut, 'PLAYER:2')
    const actor = sut.gauge('PLAYER:2')
    const ally = sut.gauge('PLAYER:3')

    const done = sut.act({ type: 'SWAP', withRef: 'PLAYER:3' })

    expect(done.isRight()).toBe(true)
    expect(sut.gauge('PLAYER:2')).toBe(actor + 500)
    expect(sut.gauge('PLAYER:3')).toBe(Math.max(0, ally - 500))
    expect(sut.unit('PLAYER:3').position).toEqual({ row: 1, column: 1 })
  })
})

describe('Battle Engine (status que abrem jogada, D125)', () => {
  const statusSkill = (
    key: string,
    status: StatusType,
    range: SkillRange = SkillRange.RANGED
  ) => ({
    ...makeSnapshotSkill(key),
    range,
    baseHitChance: 1,
    effects: [
      { type: 'APPLY_STATUS' as const, status, duration: 2, baseChance: 1 },
    ],
  })
  const shot = (key: string) => ({
    ...makeSnapshotSkill(key),
    range: SkillRange.RANGED,
    baseHitChance: 0.5,
    effects: [{ type: 'DAMAGE' as const, power: 1 }],
  })
  const firstHit = (
    engine: BattleEngine,
    actor: string,
    skillKey: string,
    target: { row: number; column: number },
    side = BattleSide.OPPONENT
  ) => {
    const preview = engine.previewSkill(actor, {
      type: 'SKILL',
      skillKey,
      targetSide: side,
      target,
    })
    if (preview.isLeft()) throw preview.value
    return preview.value.hits[0]
  }

  /** Guardião em (1,1) protegendo OPPONENT:3 em (1,2); PLAYER:0 aplica `status` nele e prévia o tiro. */
  function guardedTarget(status: StatusType) {
    const snapshot = makeBattleSnapshot()
    snapshot.opponent.units[2].characterClass = CharacterClass.GUARDIAN
    // pelo flanco, que o Guardião não intercepta: o status cai mesmo no alvo
    snapshot.player.units[0].skills[0] = statusSkill(
      'aplicar',
      status,
      SkillRange.FLANK
    )
    snapshot.player.units[0].skills[1] = shot('tiro')
    const engine = new BattleEngine(snapshot, new FixedRng([0]))
    untilTurnOf(engine, 'PLAYER:0')
    const before = firstHit(engine, 'PLAYER:0', 'tiro', { row: 1, column: 2 })
    engine.act({
      type: 'SKILL',
      skillKey: 'aplicar',
      targetSide: BattleSide.OPPONENT,
      target: { row: 1, column: 2 },
    })
    const after = firstHit(engine, 'PLAYER:0', 'tiro', { row: 1, column: 2 })
    return { before, after }
  }

  it('should be able to hit a stunned target for sure, with no guardian saving it', () => {
    const { before, after } = guardedTarget(StatusType.STUN)

    expect(before.ref).toBe('OPPONENT:2') // o Guardião intercepta
    expect(after.ref).toBe('OPPONENT:3') // indefeso: ninguém protege
    expect(after.hitChance).toBe(1)
  })

  it('should be able to isolate a rooted target from the guardian', () => {
    const { before, after } = guardedTarget(StatusType.ROOT)

    expect(before.ref).toBe('OPPONENT:2')
    expect(after.ref).toBe('OPPONENT:3')
  })

  it('should be able to halve the healing on a wounded target (damage over time)', () => {
    const snapshot = makeBattleSnapshot()
    snapshot.player.units[0].skills[0] = statusSkill('veneno', StatusType.DOT)
    snapshot.opponent.units[1].skills[0] = {
      ...makeSnapshotSkill('curar'),
      target: SkillTarget.ALLY,
      range: null,
      baseHitChance: null,
      effects: [{ type: 'HEAL', power: 2 }],
    }
    const sut = new BattleEngine(snapshot, new FixedRng([0]))
    untilTurnOf(sut, 'PLAYER:0')
    sut.act({
      type: 'SKILL',
      skillKey: 'veneno',
      targetSide: BattleSide.OPPONENT,
      target: { row: 0, column: 0 },
    })
    const healOn = (target: { row: number; column: number }) => {
      const effect = firstHit(sut, 'OPPONENT:1', 'curar', target).effects[0]
      return effect.type === 'HEAL' ? effect.amount : 0
    }

    // OPPONENT:0 (0,0) está com Ferida; OPPONENT:2 (1,1) não
    expect(healOn({ row: 0, column: 0 })).toBe(
      Math.round(healOn({ row: 1, column: 1 }) / 2)
    )
  })

  it('should be able to land statuses more often as a controller', () => {
    const chanceAs = (characterClass: CharacterClass) => {
      const snapshot = makeBattleSnapshot()
      snapshot.player.units[0].characterClass = characterClass
      snapshot.player.units[0].skills[0] = {
        ...statusSkill('atordoar', StatusType.STUN),
        effects: [
          {
            type: 'APPLY_STATUS',
            status: StatusType.STUN,
            duration: 1,
            baseChance: 0.4,
          },
        ],
      }
      const engine = new BattleEngine(snapshot, new FixedRng([0]))
      const effect = firstHit(engine, 'PLAYER:0', 'atordoar', {
        row: 0,
        column: 0,
      }).effects[0]
      return effect.type === 'APPLY_STATUS' ? effect.chance : 0
    }

    expect(chanceAs(CharacterClass.CONTROLLER)).toBeGreaterThan(
      chanceAs(CharacterClass.VANGUARD)
    )
  })
})

describe('Battle Engine (Provocar, Proteger e passivas de queda, D124)', () => {
  const at = (row: number, column: number) => ({ row, column })
  const skill = (
    target: BattleSide,
    cell: { row: number; column: number },
    skillKey: string
  ) => ({
    type: 'SKILL' as const,
    skillKey,
    targetSide: target,
    target: cell,
  })

  it('should be able to force a taunted enemy to hit the taunter, only on its next action', () => {
    const snapshot = makeBattleSnapshot()
    snapshot.player.units[0].skills[0] = {
      ...makeSnapshotSkill('provocar'),
      effects: [
        {
          type: 'APPLY_STATUS',
          status: StatusType.TAUNT,
          duration: 1,
          baseChance: 1,
        },
      ],
    }
    const sut = new BattleEngine(snapshot, new FixedRng([0]))
    untilTurnOf(sut, 'PLAYER:0')
    sut.act(skill(BattleSide.OPPONENT, at(0, 0), 'provocar'))
    expect(sut.unit('OPPONENT:0').tauntedBy).toBe('PLAYER:0')

    untilTurnOf(sut, 'OPPONENT:0')
    const strike = snapshot.opponent.units[0].skills[0].key
    // PLAYER:1 em (2,0) também é alvo de corpo a corpo, mas o Provocado tem que bater no PLAYER:0
    expect(sut.act(skill(BattleSide.PLAYER, at(2, 0), strike)).isLeft()).toBe(
      true
    )
    expect(sut.act(skill(BattleSide.PLAYER, at(0, 0), strike)).isRight()).toBe(
      true
    )
    expect(sut.unit('OPPONENT:0').tauntedBy).toBeNull()
  })

  it('should be able to protect an adjacent ally until the protector acts again', () => {
    const snapshot = makeBattleSnapshot()
    snapshot.player.units[2].skills[0] = {
      ...makeSnapshotSkill('proteger'),
      target: SkillTarget.ALLY,
      range: null,
      baseHitChance: null,
      effects: [{ type: 'PROTECT' }],
    }
    snapshot.opponent.units[0].skills[0] = {
      ...makeSnapshotSkill('tiro'),
      range: SkillRange.FLANK,
    }
    const sut = new BattleEngine(snapshot, new FixedRng([0]))
    untilTurnOf(sut, 'PLAYER:2')
    // PLAYER:2 (1,1) não é adjacente ao PLAYER:0 (0,0)
    expect(
      sut.act(skill(BattleSide.PLAYER, at(0, 0), 'proteger')).isLeft()
    ).toBe(true)
    sut.act(skill(BattleSide.PLAYER, at(1, 2), 'proteger'))

    // até o flanco, que o Interceptar não pega, cai no protetor
    const preview = sut.previewSkill(
      'OPPONENT:0',
      skill(BattleSide.PLAYER, at(1, 2), 'tiro')
    )
    expect(preview.isRight() && preview.value.hits[0].ref).toBe('PLAYER:2')

    untilTurnOf(sut, 'PLAYER:2')
    expect(sut.unit('PLAYER:3').protectedBy).toBeNull()
  })

  it('should be able to fire passives when an ally falls and when the owner falls', () => {
    const snapshot = makeBattleSnapshot()
    snapshot.player.units[0].level = 1
    snapshot.player.units[0].passive = {
      name: 'Primeiro a Cair',
      description: 'teste',
      trigger: { type: 'ON_DEFEATED' },
      effects: [{ type: 'ADVANCE_ALLIES', percent: 30 }],
    }
    snapshot.player.units[1].passive = {
      name: 'Disciplina de Guerra',
      description: 'teste',
      trigger: { type: 'ON_ALLY_DEFEATED' },
      effects: [{ type: 'STAT_MODIFIER', stat: Stat.ATTACK, percent: 20 }],
    }
    for (const unit of snapshot.opponent.units) {
      unit.skills[0] = {
        ...unit.skills[0],
        baseHitChance: 1,
        effects: [{ type: 'DAMAGE', power: 2.5 }],
      }
    }
    const sut = new BattleEngine(snapshot, new FixedRng([0]))

    for (
      let turn = sut.nextTurn();
      turn && sut.unit('PLAYER:0').alive;
      turn = sut.nextTurn()
    ) {
      sut.act(
        turn.side === BattleSide.OPPONENT
          ? skill(
              BattleSide.PLAYER,
              at(0, 0),
              snapshot.opponent.units[Number(turn.ref.split(':')[1])].skills[0]
                .key
            )
          : { type: 'DEFEND', timeout: true }
      )
    }

    const fired = sut.events
      .filter((e) => e.type === 'PASSIVE')
      .map((e) => e.type === 'PASSIVE' && e.ref)
    expect(fired).toContain('PLAYER:0')
    expect(fired).toContain('PLAYER:1')
  })
})

describe('Battle Engine (tempo, D126)', () => {
  it('should be able to project the next turns as they really happen', () => {
    const snapshot = makeBattleSnapshot()
    // níveis diferentes: velocidades diferentes, sem empate exato (que a seed decidiria na hora)
    ;[...snapshot.player.units, ...snapshot.opponent.units].forEach(
      (u, i) => (u.level = 10 + i * 3)
    )
    const sut = new BattleEngine(snapshot, new FixedRng([0]))

    const projected = sut.timeline(8).map((t) => t.ref)
    const real: string[] = []
    for (let i = 0; i < 8; i++) {
      real.push(sut.nextTurn()!.ref)
      sut.act({ type: 'DEFEND', timeout: true })
    }

    expect(projected).toEqual(real)
  })

  it('should be able to grant an ally an action right after the tactician, with Coordination', () => {
    const snapshot = makeBattleSnapshot()
    snapshot.player.units[0].characterClass = CharacterClass.TACTICIAN
    snapshot.player.units[0].skills[0] = {
      ...makeSnapshotSkill('comando'),
      target: SkillTarget.ALLY,
      range: null,
      baseHitChance: null,
      cooldown: 3,
      effects: [{ type: 'GRANT_TURN' }],
    }
    const sut = new BattleEngine(snapshot, new FixedRng([0]))
    untilTurnOf(sut, 'PLAYER:0')
    const attack = sut.unit('PLAYER:1').stats.ATTACK
    const gauge = sut.gauge('PLAYER:1')

    sut.act({
      type: 'SKILL',
      skillKey: 'comando',
      targetSide: BattleSide.PLAYER,
      target: { row: 2, column: 0 },
    })
    expect(sut.timeline(1)[0]).toMatchObject({ ref: 'PLAYER:1', extra: true })

    const turn = sut.nextTurn()!
    expect(turn.ref).toBe('PLAYER:1')
    expect(sut.gauge('PLAYER:1')).toBe(gauge) // a barra dele não muda
    expect(sut.unit('PLAYER:1').stats.ATTACK).toBeCloseTo(attack * 1.1) // Coordenação

    sut.act({ type: 'DEFEND', timeout: true })
    expect(sut.unit('PLAYER:1').stats.ATTACK).toBeCloseTo(attack) // acabou ao agir
  })
})

describe('Battle Engine (executar, D125)', () => {
  it('should be able to deal x1.5 on a rooted target and break the root', () => {
    const snapshot = makeBattleSnapshot()
    snapshot.player.units[0].skills[0] = {
      ...makeSnapshotSkill('prender'),
      baseHitChance: 1,
      effects: [
        {
          type: 'APPLY_STATUS',
          status: StatusType.ROOT,
          duration: 2,
          baseChance: 1,
        },
      ],
    }
    snapshot.player.units[0].skills[1] = {
      ...makeSnapshotSkill('estilhacar'),
      baseHitChance: 1,
      effects: [
        { type: 'DAMAGE', power: 1 },
        {
          type: 'EXPLOIT',
          status: StatusType.ROOT,
          multiplier: 1.5,
          consume: true,
        },
      ],
    }
    const sut = new BattleEngine(snapshot, new FixedRng([0]))
    untilTurnOf(sut, 'PLAYER:0')
    const shatter = {
      type: 'SKILL' as const,
      skillKey: 'estilhacar',
      targetSide: BattleSide.OPPONENT,
      target: { row: 0, column: 0 },
    }
    const damage = () => {
      const p = sut.previewSkill('PLAYER:0', shatter)
      if (p.isLeft()) throw p.value
      const e = p.value.hits[0].effects[0]
      return e.type === 'DAMAGE' ? e.amount : 0
    }
    const plain = damage()

    sut.act({ ...shatter, skillKey: 'prender' })
    expect(damage() / plain).toBeCloseTo(1.5, 1)

    untilTurnOf(sut, 'PLAYER:0')
    const done = sut.act(shatter)
    expect(
      done.isRight() &&
        done.value.some((e) => e.type === 'EXPLOIT' && e.consumed)
    ).toBe(true)
    expect(sut.unit('OPPONENT:0').canBeMoved).toBe(true) // o Preso acabou
  })
})

describe('Battle Engine (cópia para a previsão da IA)', () => {
  it('should be able to fork the battle at the same point without touching the original', () => {
    const sut = new BattleEngine(makeBattleSnapshot(), new SeededRng(7))
    for (let i = 0; i < 6; i++) {
      const turn = sut.nextTurn()!
      sut.act({
        type: 'SKILL',
        skillKey: sut.unit(turn.ref).readySkills[0],
        targetSide:
          turn.side === BattleSide.PLAYER
            ? BattleSide.OPPONENT
            : BattleSide.PLAYER,
        target: { row: 0, column: 0 },
      })
    }
    sut.nextTurn()
    const before = [...sut.events]

    const fork = sut.fork(new SeededRng(123))
    expect(fork.events).toEqual(before)
    expect(fork.currentRef).toBe(sut.currentRef)

    fork.act({ type: 'DEFEND', timeout: true })
    fork.nextTurn()
    expect(sut.events).toEqual(before)
  })
})

describe('Battle Engine (Proteger forte, formação e Engajado, D127 a D129)', () => {
  it('should be able to pay the full turn to leave the front when engaged by a melee enemy', () => {
    // todos Vanguarda: PLAYER:0 na frente da linha 0, com OPPONENT:0 (Vanguarda) na frente da linha 0 oposta
    const sut = new BattleEngine(makeBattleSnapshot(), new FixedRng([0]))
    untilTurnOf(sut, 'PLAYER:0')
    expect(sut.unit('PLAYER:0').engaged).toBe(true)
    const before = sut.gauge('PLAYER:0')

    sut.act({ type: 'MOVE', to: { row: 0, column: 1 } })

    expect(sut.gauge('PLAYER:0')).toBe(before) // sem a volta de meio turno
  })

  it('should be able to give adjacent allies the class auras, and the lone executor its bonus', () => {
    const plain = new BattleEngine(makeBattleSnapshot(), new FixedRng([0]))
    const snapshot = makeBattleSnapshot()
    // PLAYER:2 (1,1) é Guardião: PLAYER:3 (1,2) ao lado ganha +10% de Defesa
    snapshot.player.units[2].characterClass = CharacterClass.GUARDIAN
    // PLAYER:1 (2,0) é Executor sem ninguém ao lado: +10% de Ataque
    snapshot.player.units[1].characterClass = CharacterClass.EXECUTOR
    const sut = new BattleEngine(snapshot, new FixedRng([0]))

    expect(sut.unit('PLAYER:3').stats.DEFENSE).toBeCloseTo(
      plain.unit('PLAYER:3').stats.DEFENSE * 1.1
    )
    expect(sut.unit('PLAYER:1').stats.ATTACK).toBeCloseTo(
      plain.unit('PLAYER:1').stats.ATTACK * 1.1
    )
    // PLAYER:0 (0,0) não é adjacente ao Guardião
    expect(sut.unit('PLAYER:0').stats.DEFENSE).toBeCloseTo(
      plain.unit('PLAYER:0').stats.DEFENSE
    )
  })

  it('should be able to counterattack whoever hits the protected ally, with the protector harder to hurt', () => {
    const snapshot = makeBattleSnapshot()
    snapshot.player.units[2].skills[0] = {
      ...makeSnapshotSkill('proteger'),
      target: SkillTarget.ALLY,
      range: null,
      baseHitChance: null,
      effects: [{ type: 'PROTECT' }],
    }
    snapshot.opponent.units[0].skills[0] = {
      ...makeSnapshotSkill('tiro'),
      range: SkillRange.FLANK,
      baseHitChance: 1,
    }
    const sut = new BattleEngine(snapshot, new FixedRng([0]))
    untilTurnOf(sut, 'PLAYER:2')
    const defense = sut.unit('PLAYER:2').stats.DEFENSE
    sut.act({
      type: 'SKILL',
      skillKey: 'proteger',
      targetSide: BattleSide.PLAYER,
      target: { row: 1, column: 2 },
    })
    // +50% (o Desgaste da própria skill tira um pouco da Defesa base)
    expect(sut.unit('PLAYER:2').stats.DEFENSE / defense).toBeGreaterThan(1.45)

    untilTurnOf(sut, 'OPPONENT:0')
    const hp = sut.unit('OPPONENT:0').hp
    const done = sut.act({
      type: 'SKILL',
      skillKey: 'tiro',
      targetSide: BattleSide.PLAYER,
      target: { row: 1, column: 2 },
    })
    const events = done.isRight() ? done.value : []

    expect(events.some((e) => e.type === 'PROTECTED')).toBe(true)
    expect(
      events.some(
        (e) =>
          e.type === 'DAMAGE' &&
          e.ref === 'PLAYER:2' &&
          e.targetRef === 'OPPONENT:0'
      )
    ).toBe(true)
    expect(sut.unit('OPPONENT:0').hp).toBeLessThan(hp)
  })
})
