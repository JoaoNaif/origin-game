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
  it('should be able to simulate a whole AI battle', () => {
    const sut = simulateBattle(makeCalibrationSnapshot(), 1, {
      PLAYER: balanced(AiDifficulty.MASTER),
      OPPONENT: balanced(AiDifficulty.BEGINNER),
    })

    expect(sut.actions.length).toBeGreaterThan(0)
    expect(sut.round).toBeLessThanOrEqual(30)
  })

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
