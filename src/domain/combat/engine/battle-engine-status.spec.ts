import { generateCandidates } from '@/domain/ai/services/action-generator'
import { CharacterClass } from '@/domain/characters/enums/character-class'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { StatusType } from '@/domain/skills/enums/status-type'
import { SkillEffect } from '@/domain/skills/value-objects/skill-effect'
import {
  makeBattleSnapshot,
  makeSnapshotSkill,
} from 'test/factories/make-battle-snapshot'
import { FixedRng } from 'test/fakes/fixed-rng'
import { describe, expect, it } from 'vitest'
import { BattleSide } from '../enums/battle-enums'
import { BattleSnapshot } from '../value-objects/battle-snapshot'
import { BattleEngine } from './battle-engine'

// PLAYER:0 e OPPONENT:0 em (0,0), :1 em (2,0), :2 em (1,1) e :3 em (1,2): só o 2 e o 3 são vizinhos
const CELL_0 = { row: 0, column: 0 }
const CELL_2 = { row: 1, column: 1 }
const CELL_3 = { row: 1, column: 2 }

const status = (s: StatusType, duration = 2): SkillEffect => ({
  type: 'APPLY_STATUS',
  status: s,
  duration,
  baseChance: 1,
})

/** Skill à distância que sempre acerta. */
const ranged = (key: string, ...effects: SkillEffect[]) => ({
  ...makeSnapshotSkill(key),
  range: SkillRange.RANGED,
  baseHitChance: 1,
  effects,
})

const shot = (power = 1) => ranged('tiro', { type: 'DAMAGE', power })

/** Monta a batalha com a sorte sempre a favor (o 0 passa em qualquer chance). */
function battle(customize: (snapshot: BattleSnapshot) => void) {
  const snapshot = makeBattleSnapshot()
  customize(snapshot)
  return new BattleEngine(snapshot, new FixedRng([0]))
}

/** Avança Defendendo com todos até a vez de `ref`. */
function untilTurnOf(engine: BattleEngine, ref: string) {
  let turn = engine.nextTurn()!
  while (turn.ref !== ref) {
    engine.act({ type: 'DEFEND', timeout: true })
    turn = engine.nextTurn()!
  }
}

function cast(
  engine: BattleEngine,
  skillKey: string,
  target: { row: number; column: number },
  targetSide: BattleSide = BattleSide.OPPONENT
) {
  return engine.act({ type: 'SKILL', skillKey, targetSide, target })
}

/** Quantas ações o `ref` recebeu até agora (vezes que não foram puladas). */
const skipsOf = (engine: BattleEngine, ref: string) =>
  engine.events.filter((e) => e.type === 'SKIP' && e.ref === ref)

const lostBy = (engine: BattleEngine, ref: string) =>
  engine.events
    .filter((e) => e.type === 'DAMAGE' && e.targetRef === ref)
    .map((e) => (e.type === 'DAMAGE' ? e.amount + e.shieldAbsorbed : 0))

describe('Battle Engine (Silenciado, D146)', () => {
  function silenced(skills: 'WITH_BASIC' | 'NO_BASIC' = 'WITH_BASIC') {
    return battle((snapshot) => {
      snapshot.player.units[0].skills[0] = ranged(
        'calar',
        status(StatusType.SILENCE, 1)
      )
      const unit = snapshot.opponent.units[0]
      unit.skills = unit.skills.map((skill, i) => ({
        ...skill,
        tier:
          skills === 'WITH_BASIC' && i === 0
            ? SkillTier.BASIC
            : SkillTier.STANDARD,
      }))
    })
  }

  it('should be able to allow only the basic skill on the next action, then wear off', () => {
    const sut = silenced()
    untilTurnOf(sut, 'PLAYER:0')
    cast(sut, 'calar', CELL_0)
    untilTurnOf(sut, 'OPPONENT:0')
    const [basic, standard] = sut.skillsOf('OPPONENT:0')

    expect(cast(sut, standard.key, CELL_0, BattleSide.PLAYER).isLeft()).toBe(
      true
    )
    expect(sut.unit('OPPONENT:0').statuses).toContain(StatusType.SILENCE)
    expect(cast(sut, basic.key, CELL_0, BattleSide.PLAYER).isRight()).toBe(true)
    expect(sut.unit('OPPONENT:0').statuses).not.toContain(StatusType.SILENCE)
  })

  it('should be able to defend when silenced without a basic skill (D38)', () => {
    const sut = silenced('NO_BASIC')
    untilTurnOf(sut, 'PLAYER:0')
    cast(sut, 'calar', CELL_0)
    untilTurnOf(sut, 'OPPONENT:0')

    const candidates = generateCandidates(sut, 'OPPONENT:0')

    expect(candidates.some((c) => c.payload.type === 'SKILL')).toBe(false)
    expect(sut.act({ type: 'DEFEND' }).isRight()).toBe(true)
  })
})

describe('Battle Engine (Adormecido, D146)', () => {
  function sleeper(extra: SkillEffect[] = []) {
    const sut = battle((snapshot) => {
      snapshot.player.units[0].skills[0] = ranged(
        'dormir',
        status(StatusType.SLEEP),
        ...extra
      )
      snapshot.player.units[0].skills[1] = shot()
      snapshot.opponent.units[2].profile = {
        ...snapshot.opponent.units[2].profile,
        SPEED: 40,
      }
    })
    untilTurnOf(sut, 'PLAYER:0')
    cast(sut, 'dormir', CELL_2)
    return sut
  }

  it('should be able to lose at most two actions while nobody hits', () => {
    const sut = sleeper()

    for (let i = 0; i < 40 && skipsOf(sut, 'OPPONENT:2').length < 2; i++) {
      sut.nextTurn()
      sut.act({ type: 'DEFEND', timeout: true })
    }
    expect(skipsOf(sut, 'OPPONENT:2')).toEqual([
      { type: 'SKIP', ref: 'OPPONENT:2', reason: 'SLEEP' },
      { type: 'SKIP', ref: 'OPPONENT:2', reason: 'SLEEP' },
    ])

    untilTurnOf(sut, 'OPPONENT:2')
    expect(sut.unit('OPPONENT:2').statuses).not.toContain(StatusType.SLEEP)
  })

  it('should be able to wake up on damage, with immunity against sleeping again', () => {
    const sut = sleeper()
    untilTurnOf(sut, 'PLAYER:0')

    cast(sut, 'tiro', CELL_2)

    expect(sut.events.some((e) => e.type === 'WOKE')).toBe(true)
    expect(sut.unit('OPPONENT:2').statuses).not.toContain(StatusType.SLEEP)

    untilTurnOf(sut, 'PLAYER:0')
    const preview = sut.previewSkill('PLAYER:0', {
      type: 'SKILL',
      skillKey: 'dormir',
      targetSide: BattleSide.OPPONENT,
      target: CELL_2,
    })
    if (preview.isLeft()) throw preview.value
    expect(preview.value.hits[0].effects).toContainEqual({
      type: 'APPLY_STATUS',
      status: StatusType.SLEEP,
      chance: 0,
    })
  })

  it('should be able to wake up from its own damage over time and still act', () => {
    const sut = sleeper([status(StatusType.DOT, 3)])

    untilTurnOf(sut, 'OPPONENT:2')

    expect(skipsOf(sut, 'OPPONENT:2')).toEqual([])
    expect(sut.unit('OPPONENT:2').statuses).not.toContain(StatusType.SLEEP)
  })

  it('should not be able to receive a granted turn or intercept while asleep', () => {
    const sut = battle((snapshot) => {
      snapshot.player.units[0].skills[0] = ranged(
        'dormir',
        status(StatusType.SLEEP)
      )
      snapshot.player.units[0].skills[1] = shot()
      snapshot.opponent.units[2].characterClass = CharacterClass.GUARDIAN
      snapshot.opponent.units[1].skills[0] = {
        ...makeSnapshotSkill('comando'),
        target: SkillTarget.ALLY,
        range: null,
        baseHitChance: null,
        effects: [{ type: 'GRANT_TURN' }],
      }
    })
    untilTurnOf(sut, 'PLAYER:0')
    const shotOnThree = () => {
      const preview = sut.previewSkill('PLAYER:0', {
        type: 'SKILL',
        skillKey: 'tiro',
        targetSide: BattleSide.OPPONENT,
        target: CELL_3,
      })
      if (preview.isLeft()) throw preview.value
      return preview.value.hits[0].ref
    }

    expect(shotOnThree()).toBe('OPPONENT:2') // o Guardião acordado intercepta
    cast(sut, 'dormir', CELL_2)

    untilTurnOf(sut, 'OPPONENT:1')
    expect(cast(sut, 'comando', CELL_2, BattleSide.OPPONENT).isLeft()).toBe(
      true
    )
    sut.act({ type: 'DEFEND', timeout: true })
    untilTurnOf(sut, 'PLAYER:0')
    expect(sut.unit('OPPONENT:2').statuses).toContain(StatusType.SLEEP)
    expect(shotOnThree()).toBe('OPPONENT:3')
  })
})

describe('Battle Engine (Ligado, D146)', () => {
  function linked(power = 1) {
    const sut = battle((snapshot) => {
      snapshot.player.units[0].skills[0] = ranged(
        'ligar',
        status(StatusType.LINK)
      )
      snapshot.player.units[0].skills[1] = shot(power)
    })
    untilTurnOf(sut, 'PLAYER:0')
    cast(sut, 'ligar', CELL_2)
    untilTurnOf(sut, 'PLAYER:0')
    return sut
  }

  it('should be able to link the target with the adjacent ally, both ways', () => {
    const sut = linked()

    expect(sut.unit('OPPONENT:2').linkedWith).toBe('OPPONENT:3')
    expect(sut.unit('OPPONENT:3').linkedWith).toBe('OPPONENT:2')
    expect(sut.unit('OPPONENT:3').statuses).toContain(StatusType.LINK)
  })

  it('should be able to pass 30% of the direct damage without bouncing back', () => {
    const sut = linked()

    cast(sut, 'tiro', CELL_2)
    const [hit] = lostBy(sut, 'OPPONENT:2')
    const [shared, ...rest] = lostBy(sut, 'OPPONENT:3')

    expect(shared).toBe(Math.round(hit * 0.3))
    expect(rest).toEqual([])
    expect(lostBy(sut, 'OPPONENT:2')).toEqual([hit])
  })

  it('should be able to end the link when one of them dies, and the killing blow still passes', () => {
    const sut = linked(50)

    cast(sut, 'tiro', CELL_2)

    expect(sut.unit('OPPONENT:2').alive).toBe(false)
    expect(lostBy(sut, 'OPPONENT:3').length).toBe(1)
    expect(sut.unit('OPPONENT:3').linkedWith).toBeNull()
    expect(sut.unit('OPPONENT:3').statuses).not.toContain(StatusType.LINK)
  })

  it('should be able to pick the adjacent ally with the least HP', () => {
    const sut = battle((snapshot) => {
      snapshot.opponent.units[0].row = 0
      snapshot.opponent.units[0].column = 1
      snapshot.opponent.units[1].row = 2
      snapshot.opponent.units[1].column = 1
      snapshot.player.units[0].skills[0] = ranged(
        'ligar',
        status(StatusType.LINK)
      )
      snapshot.player.units[0].skills[1] = shot()
    })
    untilTurnOf(sut, 'PLAYER:0')
    cast(sut, 'tiro', { row: 2, column: 1 }) // OPPONENT:1 fica com menos vida
    untilTurnOf(sut, 'PLAYER:0')

    cast(sut, 'ligar', CELL_2)

    expect(sut.unit('OPPONENT:2').linkedWith).toBe('OPPONENT:1')
  })

  it('should not be able to link a target with no adjacent ally', () => {
    const sut = battle((snapshot) => {
      snapshot.player.units[0].skills[0] = ranged(
        'ligar',
        status(StatusType.LINK)
      )
    })
    untilTurnOf(sut, 'PLAYER:0')
    const preview = sut.previewSkill('PLAYER:0', {
      type: 'SKILL',
      skillKey: 'ligar',
      targetSide: BattleSide.OPPONENT,
      target: CELL_0,
    })
    if (preview.isLeft()) throw preview.value

    expect(preview.value.hits[0].effects[0]).toMatchObject({ chance: 0 })
    expect(cast(sut, 'ligar', CELL_0).isRight()).toBe(true)
    expect(sut.unit('OPPONENT:0').linkedWith).toBeNull()
    expect(sut.unit('OPPONENT:0').statuses).not.toContain(StatusType.LINK)
  })

  it('should be able to end for both when the duration runs out', () => {
    const sut = linked()

    for (let i = 0; i < 60 && sut.unit('OPPONENT:2').linkedWith; i++) {
      sut.nextTurn()
      sut.act({ type: 'DEFEND', timeout: true })
    }

    expect(sut.unit('OPPONENT:2').linkedWith).toBeNull()
    expect(sut.unit('OPPONENT:3').linkedWith).toBeNull()
    expect(sut.unit('OPPONENT:2').statuses).not.toContain(StatusType.LINK)
    expect(sut.unit('OPPONENT:3').statuses).not.toContain(StatusType.LINK)
  })
})

describe('Battle Engine (Furtivo, D146)', () => {
  /** OPPONENT:2 some; é a vez de PLAYER:0, com tiro, corpo a corpo, flanco e área. */
  function hidden(customize?: (snapshot: BattleSnapshot) => void) {
    const sut = battle((snapshot) => {
      snapshot.opponent.units[2].skills[0] = {
        ...makeSnapshotSkill('sumir'),
        target: SkillTarget.SELF,
        range: null,
        baseHitChance: null,
        effects: [status(StatusType.STEALTH, 1)],
      }
      snapshot.player.units[0].skills = [
        shot(),
        { ...makeSnapshotSkill('soco'), baseHitChance: 1 },
        { ...shot(), key: 'flanco', range: SkillRange.FLANK },
        { ...shot(), key: 'area', area: SkillArea.GRID },
      ]
      customize?.(snapshot)
    })
    untilTurnOf(sut, 'OPPONENT:2')
    cast(sut, 'sumir', CELL_2, BattleSide.OPPONENT)
    untilTurnOf(sut, 'PLAYER:0')
    return sut
  }

  const hitsOf = (
    engine: BattleEngine,
    skillKey: string,
    target: { row: number; column: number }
  ) => {
    const preview = engine.previewSkill('PLAYER:0', {
      type: 'SKILL',
      skillKey,
      targetSide: BattleSide.OPPONENT,
      target,
    })
    return preview.isLeft() ? null : preview.value.hits.map((h) => h.ref).sort()
  }

  it('should not be able to be picked by a ranged or melee single-target skill', () => {
    const sut = hidden()

    expect(hitsOf(sut, 'tiro', CELL_2)).toBeNull()
    expect(hitsOf(sut, 'soco', CELL_2)).toBeNull()
  })

  it('should be able to leave the next unit of the row exposed to melee', () => {
    const sut = hidden()

    expect(hitsOf(sut, 'soco', CELL_3)).toEqual(['OPPONENT:3'])
  })

  it('should be able to send a flank to the last visible unit of the row', () => {
    const sut = battle((snapshot) => {
      snapshot.opponent.units[3].skills[0] = {
        ...makeSnapshotSkill('sumir'),
        target: SkillTarget.SELF,
        range: null,
        baseHitChance: null,
        effects: [status(StatusType.STEALTH, 1)],
      }
      snapshot.player.units[0].skills[0] = {
        ...shot(),
        key: 'flanco',
        range: SkillRange.FLANK,
      }
    })
    untilTurnOf(sut, 'OPPONENT:3')
    cast(sut, 'sumir', CELL_3, BattleSide.OPPONENT)
    untilTurnOf(sut, 'PLAYER:0')

    expect(hitsOf(sut, 'flanco', CELL_2)).toEqual(['OPPONENT:2'])
  })

  it('should be able to be hit by area skills', () => {
    const sut = hidden()

    expect(hitsOf(sut, 'area', CELL_2)).toContain('OPPONENT:2')
  })

  it('should be able to wear off on its next turn', () => {
    const sut = hidden()
    expect(sut.unit('OPPONENT:2').isHidden).toBe(true)

    sut.act({ type: 'DEFEND', timeout: true })
    untilTurnOf(sut, 'OPPONENT:2')

    expect(sut.unit('OPPONENT:2').isHidden).toBe(false)
  })

  it('should not be able to intercept while hidden', () => {
    const sut = hidden((snapshot) => {
      snapshot.opponent.units[2].characterClass = CharacterClass.GUARDIAN
    })

    expect(hitsOf(sut, 'tiro', CELL_3)).toEqual(['OPPONENT:3'])
  })

  it('should be able to free a taunted unit when the taunter hides', () => {
    const speed = (
      unit: BattleSnapshot['player']['units'][number],
      SPEED: number
    ) => {
      unit.profile = { ...unit.profile, SPEED }
    }
    const sut = battle((snapshot) => {
      // ordem: OPPONENT:2 provoca, OPPONENT:3 esconde o provocador, PLAYER:0 age
      for (const side of [snapshot.player, snapshot.opponent]) {
        for (const unit of side.units) speed(unit, 30)
      }
      speed(snapshot.opponent.units[2], 300)
      speed(snapshot.opponent.units[3], 250)
      speed(snapshot.player.units[0], 200)
      snapshot.opponent.units[2].skills[0] = ranged(
        'provocar',
        status(StatusType.TAUNT, 1)
      )
      snapshot.opponent.units[3].skills[0] = {
        ...makeSnapshotSkill('esconder'),
        target: SkillTarget.ALLY,
        range: null,
        baseHitChance: null,
        effects: [status(StatusType.STEALTH, 1)],
      }
      snapshot.player.units[0].skills[0] = shot()
    })
    untilTurnOf(sut, 'OPPONENT:2')
    cast(sut, 'provocar', CELL_0, BattleSide.PLAYER)
    const shotAtThree = () =>
      sut.previewSkill('PLAYER:0', {
        type: 'SKILL',
        skillKey: 'tiro',
        targetSide: BattleSide.OPPONENT,
        target: CELL_3,
      })
    expect(shotAtThree().isLeft()).toBe(true) // Provocado: tem que mirar no provocador

    untilTurnOf(sut, 'OPPONENT:3')
    cast(sut, 'esconder', CELL_2, BattleSide.OPPONENT)
    untilTurnOf(sut, 'PLAYER:0')

    expect(sut.unit('PLAYER:0').statuses).toContain(StatusType.TAUNT)
    expect(sut.unit('OPPONENT:2').isHidden).toBe(true)
    expect(shotAtThree().isRight()).toBe(true)
  })
})

describe('Battle Engine (Purificar, D146)', () => {
  function cleansable(...effects: SkillEffect[]) {
    const sut = battle((snapshot) => {
      snapshot.player.units[0].skills[0] = ranged('sujar', ...effects)
      snapshot.opponent.units[3].skills[0] = {
        ...makeSnapshotSkill('limpar'),
        target: SkillTarget.ALLY,
        range: null,
        baseHitChance: null,
        effects: [{ type: 'CLEANSE' }],
      }
    })
    untilTurnOf(sut, 'PLAYER:0')
    cast(sut, 'sujar', CELL_2)
    return sut
  }

  it('should be able to remove only the worst negative status', () => {
    const sut = cleansable(
      status(StatusType.MARK, 3),
      status(StatusType.ROOT, 3)
    )
    untilTurnOf(sut, 'OPPONENT:3')

    cast(sut, 'limpar', CELL_2, BattleSide.OPPONENT)

    expect(sut.unit('OPPONENT:2').statuses).toEqual([StatusType.ROOT])
    expect(sut.events).toContainEqual({
      type: 'CLEANSE',
      ref: 'OPPONENT:3',
      targetRef: 'OPPONENT:2',
      status: StatusType.MARK,
    })
  })

  it('should be able to break the link for both', () => {
    const sut = cleansable(status(StatusType.LINK, 3))
    untilTurnOf(sut, 'OPPONENT:3')

    cast(sut, 'limpar', CELL_2, BattleSide.OPPONENT)

    expect(sut.unit('OPPONENT:2').linkedWith).toBeNull()
    expect(sut.unit('OPPONENT:3').linkedWith).toBeNull()
    expect(sut.unit('OPPONENT:3').statuses).not.toContain(StatusType.LINK)
  })

  it('should be able to do nothing on a clean ally, spending the turn', () => {
    const sut = cleansable({ type: 'DAMAGE', power: 0.1 })
    untilTurnOf(sut, 'OPPONENT:3')

    expect(cast(sut, 'limpar', CELL_2, BattleSide.OPPONENT).isRight()).toBe(
      true
    )

    expect(sut.events).toContainEqual({
      type: 'CLEANSE',
      ref: 'OPPONENT:3',
      targetRef: 'OPPONENT:2',
      status: null,
    })
  })
})

describe('Battle Engine (Contágio, D146)', () => {
  const statusesOf = (engine: BattleEngine, ref: string) =>
    engine.unit(ref).statuses

  function infected(...effects: SkillEffect[]) {
    const sut = battle((snapshot) => {
      snapshot.player.units[0].skills[0] = ranged('infectar', ...effects)
    })
    untilTurnOf(sut, 'PLAYER:0')
    cast(sut, 'infectar', CELL_2)
    return sut
  }

  it('should be able to spread damage over time to adjacent allies, once and without chaining', () => {
    const sut = infected(
      status(StatusType.DOT, 3),
      status(StatusType.CONTAGION, 3)
    )
    expect(statusesOf(sut, 'OPPONENT:3')).not.toContain(StatusType.DOT)

    untilTurnOf(sut, 'OPPONENT:2')

    expect(statusesOf(sut, 'OPPONENT:3')).toContain(StatusType.DOT)
    expect(statusesOf(sut, 'OPPONENT:3')).not.toContain(StatusType.CONTAGION)
    expect(statusesOf(sut, 'OPPONENT:0')).not.toContain(StatusType.DOT)
    expect(statusesOf(sut, 'OPPONENT:1')).not.toContain(StatusType.DOT)
  })

  it('should not be able to spread without damage over time', () => {
    const sut = infected(status(StatusType.CONTAGION, 3))

    untilTurnOf(sut, 'OPPONENT:2')

    expect(statusesOf(sut, 'OPPONENT:3')).not.toContain(StatusType.DOT)
  })
})
