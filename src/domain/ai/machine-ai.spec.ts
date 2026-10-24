import { SeededRng } from '@/core/rng/seeded-rng'
import { BattleEngine } from '@/domain/combat/engine/battle-engine'
import { BattleSide } from '@/domain/combat/enums/battle-enums'
import { BattleActionPayload } from '@/domain/combat/value-objects/battle-action'
import { BattleSnapshot } from '@/domain/combat/value-objects/battle-snapshot'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import {
  makeBattleSnapshot,
  makeSnapshotSkill,
} from 'test/factories/make-battle-snapshot'
import { FixedRng } from 'test/fakes/fixed-rng'
import { describe, expect, it } from 'vitest'
import { AiDifficulty } from './enums/ai-difficulty'
import { AiProfile } from './enums/ai-profile'
import { aiRng, MachineAi } from './machine-ai'
import { DIFFICULTY_RULES, PROFILE_WEIGHTS } from './ai-values'
import { generateCandidates } from './services/action-generator'
import { normalizeScores } from './services/action-sampler'
import { weightedScore } from './services/action-scorer'

function makeAi(
  side: BattleSide,
  difficulty: AiDifficulty = AiDifficulty.GRANDMASTER,
  profile: AiProfile = AiProfile.BALANCED,
  seed = 1
) {
  return new MachineAi({ side, profile, difficulty }, aiRng(seed, side))
}

/** IA contra IA até o fim; devolve as ações tomadas. */
function playAiVsAi(engine: BattleEngine, ais: Record<BattleSide, MachineAi>) {
  const actions: { ref: string; payload: BattleActionPayload }[] = []

  for (let turn = engine.nextTurn(); turn; turn = engine.nextTurn()) {
    const { payload } = ais[turn.side].decide(engine, turn.ref)
    const result = engine.act(payload)
    if (result.isLeft()) throw result.value
    actions.push({ ref: turn.ref, payload })
  }

  return actions
}

/** Snapshot com um curandeiro no lado da IA e skills variadas. */
function makeMixedSnapshot(): BattleSnapshot {
  const snapshot = makeBattleSnapshot()
  const healer = snapshot.opponent.units[2]
  healer.skills[1] = {
    ...makeSnapshotSkill(`${healer.ref}-heal`),
    target: SkillTarget.ALLY,
    range: null,
    baseHitChance: null,
    cooldown: 1,
    effects: [{ type: 'HEAL', power: 2 }],
  }
  healer.skills[2] = {
    ...makeSnapshotSkill(`${healer.ref}-line`),
    area: SkillArea.LINE,
    cooldown: 2,
    effects: [{ type: 'DAMAGE', power: 0.6 }],
  }

  return snapshot
}

describe('Machine AI', () => {
  it(
    'should be able to play a whole battle with only legal actions',
    { timeout: 60_000 },
    () => {
      const sut = new BattleEngine(makeMixedSnapshot(), new SeededRng(3))

      playAiVsAi(sut, {
        PLAYER: makeAi(BattleSide.PLAYER, AiDifficulty.BEGINNER),
        OPPONENT: makeAi(BattleSide.OPPONENT, AiDifficulty.MASTER),
      })

      expect(sut.outcome).not.toBeNull()
    }
  )

  it('should be able to decide the same way for the same seed (D90)', () => {
    const run = () => {
      const engine = new BattleEngine(makeMixedSnapshot(), new SeededRng(11))
      playAiVsAi(engine, {
        PLAYER: makeAi(BattleSide.PLAYER, AiDifficulty.INTERMEDIATE),
        OPPONENT: makeAi(BattleSide.OPPONENT, AiDifficulty.ADVANCED),
      })
      return engine.events
    }

    expect(run()).toEqual(run())
  })

  it('should be able to replay an AI battle from the actions alone', () => {
    const original = new BattleEngine(makeMixedSnapshot(), new SeededRng(5))
    const actions = playAiVsAi(original, {
      PLAYER: makeAi(BattleSide.PLAYER, AiDifficulty.BEGINNER),
      OPPONENT: makeAi(BattleSide.OPPONENT, AiDifficulty.BEGINNER),
    })

    // o replay não roda a IA: a sorte do motor não pode ter sido usada por ela
    const replay = new BattleEngine(makeMixedSnapshot(), new SeededRng(5))
    for (const { payload } of actions) {
      replay.nextTurn()
      replay.act(payload)
    }
    // o fim pode cair no começo de um turno (dano contínuo), dentro do nextTurn
    replay.nextTurn()

    expect(replay.events).toEqual(original.events)
  })

  it('should be able to generate only actions the engine accepts', () => {
    const engine = new BattleEngine(makeMixedSnapshot(), new SeededRng(1))
    const turn = engine.nextTurn()!
    const candidates = generateCandidates(engine, turn.ref)

    expect(candidates.some((c) => c.payload.type === 'SKILL')).toBe(true)
    // D38: com skill possível, Defender não é opção
    expect(candidates.some((c) => c.payload.type === 'DEFEND')).toBe(false)

    for (const { payload } of candidates) {
      const fresh = new BattleEngine(makeMixedSnapshot(), new SeededRng(1))
      fresh.nextTurn()
      expect(fresh.act(payload).isRight()).toBe(true)
    }
  })

  it('should be able to finish a target in reach as a grandmaster', () => {
    const engine = new BattleEngine(makeBattleSnapshot(), new FixedRng([0]))
    const weak = 'PLAYER:0'

    // a máquina bate no exposto da linha 0 até ele ficar a um golpe de cair
    let turn = engine.nextTurn()!
    for (;;) {
      if (turn.side === BattleSide.OPPONENT) {
        if (engine.unit(weak).hp < 25) break
        engine.act({
          type: 'SKILL',
          skillKey: engine.unit(turn.ref).readySkills[0],
          targetSide: BattleSide.PLAYER,
          target: { row: 0, column: 0 },
        })
      } else {
        engine.act({ type: 'DEFEND', timeout: true })
      }
      turn = engine.nextTurn()!
    }

    const sut = makeAi(BattleSide.OPPONENT, AiDifficulty.GRANDMASTER)
    const decision = sut.decide(engine, turn.ref)

    expect(decision.payload).toMatchObject({
      type: 'SKILL',
      target: { row: 0, column: 0 },
    })
  })

  it('should be able to value healing only from the master level up', () => {
    const snapshot = makeMixedSnapshot()
    const engine = new BattleEngine(snapshot, new FixedRng([0]))
    const healerRef = snapshot.opponent.units[2].ref
    const healOn = (difficulty: AiDifficulty) =>
      makeAi(BattleSide.OPPONENT, difficulty)
        .decide(engine, healerRef)
        .candidates.find(
          (c) =>
            c.payload.type === 'SKILL' &&
            c.payload.skillKey.endsWith('heal') &&
            c.payload.target.row === 0 &&
            c.payload.target.column === 0
        )!

    // ninguém ferido: a cura não rende nada
    expect(healOn(AiDifficulty.MASTER).factors.SUPPORT).toBe(0)

    // o jogador fere OPPONENT:0 (em 0,0)
    let turn = engine.nextTurn()!
    while (engine.unit('OPPONENT:0').hp === engine.unit('OPPONENT:0').maxHp) {
      engine.act(
        turn.side === BattleSide.PLAYER
          ? {
              type: 'SKILL',
              skillKey: engine.unit(turn.ref).readySkills[0],
              targetSide: BattleSide.OPPONENT,
              target: { row: 0, column: 0 },
            }
          : { type: 'DEFEND', timeout: true }
      )
      turn = engine.nextTurn()!
    }

    expect(healOn(AiDifficulty.MASTER).factors.SUPPORT).toBeGreaterThan(0)
    expect(healOn(AiDifficulty.MASTER).score).toBeGreaterThan(
      healOn(AiDifficulty.ADVANCED).score
    )
  })

  it('should be able to raise protection for the character the player focuses', () => {
    const snapshot = makeBattleSnapshot()
    const engine = new BattleEngine(snapshot, new FixedRng([0]))
    const sut = makeAi(BattleSide.OPPONENT, AiDifficulty.GRANDMASTER)
    const focused = 'OPPONENT:0'

    // o jogador ataca o mesmo personagem (3 vezes seguidas ou mais) até a vez dele
    let attacks = 0
    let turn = engine.nextTurn()!
    while (attacks < 3 || turn.ref !== focused) {
      if (turn.side === BattleSide.PLAYER) {
        engine.act({
          type: 'SKILL',
          skillKey: engine.unit(turn.ref).readySkills[0],
          targetSide: BattleSide.OPPONENT,
          target: { row: 0, column: 0 },
        })
        attacks += 1
      } else {
        engine.act({ type: 'DEFEND', timeout: true })
      }
      turn = engine.nextTurn()!
    }

    const decision = sut.decide(engine, focused)
    // mover o focado é uma ação de proteção (10.2)
    const defend = decision.candidates.find((c) => c.payload.type === 'MOVE')!
    // nota sem o log: a mesma conta, só sem o bônus de proteção
    const base = normalizeScores(
      decision.candidates.map((c) =>
        weightedScore(
          c.factors,
          PROFILE_WEIGHTS.BALANCED,
          DIFFICULTY_RULES.GRANDMASTER.factors
        )
      )
    )[decision.candidates.indexOf(defend)]

    // 3 ataques seguidos = padrão (+0,30), escala do Grão-mestre ×1,0
    expect(defend.score - base).toBeCloseTo(0.3)
  })
})
