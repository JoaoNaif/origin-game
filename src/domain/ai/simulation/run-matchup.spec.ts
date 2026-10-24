import { BattleSide } from '@/domain/combat/enums/battle-enums'
import { aiRng, MachineAi } from '../machine-ai'
import { SeededRng } from '@/core/rng/seeded-rng'
import { BattleEngine } from '@/domain/combat/engine/battle-engine'
import { makeCalibrationSnapshot } from 'test/factories/make-calibration-snapshot'
import { describe, expect, it } from 'vitest'
import { AiDifficulty } from '../enums/ai-difficulty'
import { AiProfile } from '../enums/ai-profile'
import { runMatchup } from './run-matchup'
import { AiSetup, simulateBattle } from './simulate-battle'

const balanced = (difficulty: AiDifficulty): AiSetup => ({
  profile: AiProfile.BALANCED,
  difficulty,
})

describe('Simulator', () => {
  it(
    'should be able to simulate a whole AI battle',
    { timeout: 60_000 },
    () => {
      const sut = simulateBattle(makeCalibrationSnapshot(), 1, {
        PLAYER: balanced(AiDifficulty.MASTER),
        OPPONENT: balanced(AiDifficulty.BEGINNER),
      })

      expect(sut.actions.length).toBeGreaterThan(0)
      expect(sut.round).toBeLessThanOrEqual(30)
    }
  )

  it('should be able to replay a simulated battle from its actions', () => {
    const setups = {
      PLAYER: balanced(AiDifficulty.ADVANCED),
      OPPONENT: balanced(AiDifficulty.INTERMEDIATE),
    }
    const sut = simulateBattle(makeCalibrationSnapshot(), 9, setups)

    const replay = new BattleEngine(makeCalibrationSnapshot(), new SeededRng(9))
    for (const action of sut.actions) {
      expect(replay.nextTurn()?.ref).toBe(action.actorRef)
      replay.act(action.payload)
    }
    // o fim pode cair no começo de um turno (dano contínuo), dentro do nextTurn
    expect(replay.nextTurn()).toBeNull()

    expect(replay.outcome?.winner).toBe(sut.winner)
  })

  it('should be able to count wins with sides alternating', () => {
    const sut = runMatchup({
      snapshot: makeCalibrationSnapshot(),
      a: balanced(AiDifficulty.BEGINNER),
      b: balanced(AiDifficulty.BEGINNER),
      battles: 4,
    })

    expect(sut.battles).toBe(4)
    expect(sut.winsA).toBeGreaterThanOrEqual(0)
    expect(sut.winRateA).toBe(sut.winsA / 4)
    expect(sut.averageRound).toBeGreaterThan(0)
  })
})

describe('Simulator (previsão da IA)', () => {
  it('should be able to replay a grandmaster battle: the lookahead never uses the battle rng', () => {
    const setups = {
      PLAYER: {
        profile: AiProfile.BALANCED,
        difficulty: AiDifficulty.GRANDMASTER,
      },
      OPPONENT: {
        profile: AiProfile.BALANCED,
        difficulty: AiDifficulty.MASTER,
      },
    }
    const sut = simulateBattle(makeCalibrationSnapshot(), 4, setups)

    const replay = new BattleEngine(makeCalibrationSnapshot(), new SeededRng(4))
    for (const action of sut.actions) {
      expect(replay.nextTurn()?.ref).toBe(action.actorRef)
      replay.act(action.payload)
    }
    expect(replay.nextTurn()).toBeNull()
    expect(replay.outcome?.winner).toBe(sut.winner)
  }, 120_000)
})

describe('Simulator (cópia direta da batalha)', () => {
  it('should be able to copy the battle directly exactly as rebuilding it from the actions', () => {
    const setup = {
      profile: AiProfile.BALANCED,
      difficulty: AiDifficulty.INTERMEDIATE,
    }
    const playOn = (engine: BattleEngine, seed: number, limit = Infinity) => {
      const ais = {
        PLAYER: new MachineAi(
          { side: BattleSide.PLAYER, ...setup },
          aiRng(seed, BattleSide.PLAYER)
        ),
        OPPONENT: new MachineAi(
          { side: BattleSide.OPPONENT, ...setup },
          aiRng(seed, BattleSide.OPPONENT)
        ),
      }
      let n = 0
      for (
        let turn = engine.nextTurn();
        turn && n < limit;
        turn = engine.nextTurn(), n++
      ) {
        engine.act(ais[turn.side].decide(engine, turn.ref).payload)
      }
    }

    for (const seed of [3, 8, 21]) {
      for (const point of [1, 15, 40, 70]) {
        const original = new BattleEngine(
          makeCalibrationSnapshot(),
          new SeededRng(seed)
        )
        playOn(original, seed, point)
        if (original.outcome) continue

        const direct = original.fork(new SeededRng(seed * 31))
        const rebuilt = original.forkByReplay(new SeededRng(seed * 31))
        playOn(direct, seed + 1)
        playOn(rebuilt, seed + 1)

        expect(direct.events).toEqual(rebuilt.events)
        expect(direct.outcome).toEqual(rebuilt.outcome)
      }
    }
  }, 120_000)
})
