import { AiDifficulty } from '@/domain/ai/enums/ai-difficulty'
import { AiProfile } from '@/domain/ai/enums/ai-profile'
import { makeAccount } from 'test/factories/make-account'
import { makeBattleSnapshot } from 'test/factories/make-battle-snapshot'
import { makeNpcSquad } from 'test/factories/make-npc-squad'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  BattleEndReason,
  BattleMode,
  BattleSide,
  BattleStatus,
} from '../enums/battle-enums'
import { InvalidBattleError } from '../errors/invalid-battle-error'
import { Battle, StartPveBattleInput } from './battle'

const STARTED_AT = new Date('2026-10-18T12:00:00Z')

describe('Battle', () => {
  let input: StartPveBattleInput

  beforeEach(() => {
    input = {
      account: makeAccount(),
      npcSquad: makeNpcSquad(),
      seed: 42,
      engineVersion: '0.1.0',
      contentVersion: 'seed-1',
      snapshot: makeBattleSnapshot(),
      startedAt: STARTED_AT,
    }
  })

  const startBattle = () => {
    const result = Battle.startPve(input)
    if (result.isLeft()) throw result.value

    return result.value
  }

  describe('Start PvE Battle', () => {
    it('should be able to start a battle against the machine', () => {
      const sut = Battle.startPve(input)

      expect(sut.isRight()).toBe(true)
      if (sut.isRight()) {
        expect(sut.value.mode).toBe(BattleMode.PVE)
        expect(sut.value.status).toBe(BattleStatus.IN_PROGRESS)
        expect(sut.value.aiProfile).toBe(AiProfile.CAUTIOUS)
        expect(sut.value.aiDifficulty).toBe(AiDifficulty.BEGINNER)
        expect(sut.value.actions).toHaveLength(0)
      }
    })

    it('should not be able to start with an invalid seed', () => {
      input.seed = -1

      expect(Battle.startPve(input).isLeft()).toBe(true)
    })

    it('should not be able to start without the engine version', () => {
      input.engineVersion = ''

      expect(Battle.startPve(input).isLeft()).toBe(true)
    })

    it('should not be able to start with an incomplete side', () => {
      input.snapshot.opponent.units.pop()

      const sut = Battle.startPve(input)

      expect(sut.isLeft()).toBe(true)
      expect(sut.value).toBeInstanceOf(InvalidBattleError)
    })

    it('should not be able to start with two units on the same cell', () => {
      input.snapshot.player.units[1] = {
        ...input.snapshot.player.units[1],
        row: 0,
        column: 0,
      }

      expect(Battle.startPve(input).isLeft()).toBe(true)
    })
  })

  describe('Record Action', () => {
    it('should be able to record actions in sequence', () => {
      const sut = startBattle()

      sut.recordAction({
        round: 1,
        side: BattleSide.PLAYER,
        actorRef: 'PLAYER:0',
        payload: {
          type: 'SKILL',
          skillKey: 'PLAYER:0-skill-0',
          targetSide: BattleSide.OPPONENT,
          target: { row: 0, column: 0 },
        },
      })
      const second = sut.recordAction({
        round: 1,
        side: BattleSide.OPPONENT,
        actorRef: 'OPPONENT:2',
        payload: { type: 'DEFEND' },
      })

      expect(second.isRight()).toBe(true)
      expect(sut.actions.map((a) => a.sequence)).toEqual([0, 1])
    })

    it('should not be able to act with a unit of the other side', () => {
      const sut = startBattle()

      const result = sut.recordAction({
        round: 1,
        side: BattleSide.PLAYER,
        actorRef: 'OPPONENT:0',
        payload: { type: 'DEFEND' },
      })

      expect(result.isLeft()).toBe(true)
    })

    it('should not be able to swap with an enemy', () => {
      const sut = startBattle()

      const result = sut.recordAction({
        round: 1,
        side: BattleSide.PLAYER,
        actorRef: 'PLAYER:0',
        payload: { type: 'SWAP', withRef: 'OPPONENT:1' },
      })

      expect(result.isLeft()).toBe(true)
    })

    it('should not be able to go back a round', () => {
      const sut = startBattle()
      sut.recordAction({
        round: 2,
        side: BattleSide.PLAYER,
        actorRef: 'PLAYER:0',
        payload: { type: 'DEFEND' },
      })

      const result = sut.recordAction({
        round: 1,
        side: BattleSide.PLAYER,
        actorRef: 'PLAYER:1',
        payload: { type: 'DEFEND' },
      })

      expect(result.isLeft()).toBe(true)
    })
  })

  describe('Finish Battle', () => {
    it('should be able to finish with a winner', () => {
      const sut = startBattle()

      const result = sut.finish({
        winner: BattleSide.PLAYER,
        reason: BattleEndReason.ELIMINATION,
        rounds: 12,
        finishedAt: new Date('2026-10-18T12:09:00Z'),
      })

      expect(result.isRight()).toBe(true)
      expect(sut.isFinished).toBe(true)
      expect(sut.winner).toBe(BattleSide.PLAYER)
    })

    it('should not be able to record actions after the end', () => {
      const sut = startBattle()
      sut.finish({
        winner: BattleSide.OPPONENT,
        reason: BattleEndReason.ABANDON,
        rounds: 3,
        finishedAt: STARTED_AT,
      })

      const result = sut.recordAction({
        round: 3,
        side: BattleSide.PLAYER,
        actorRef: 'PLAYER:0',
        payload: { type: 'DEFEND' },
      })

      expect(result.isLeft()).toBe(true)
    })

    it('should only force the end on round 30', () => {
      const sut = startBattle()

      const result = sut.finish({
        winner: BattleSide.PLAYER,
        reason: BattleEndReason.ROUND_LIMIT,
        rounds: 20,
        finishedAt: STARTED_AT,
      })

      expect(result.isLeft()).toBe(true)
    })

    it('should not be able to finish before it started', () => {
      const sut = startBattle()

      const result = sut.finish({
        winner: BattleSide.PLAYER,
        reason: BattleEndReason.ELIMINATION,
        rounds: 10,
        finishedAt: new Date('2026-10-18T11:00:00Z'),
      })

      expect(result.isLeft()).toBe(true)
    })
  })
})
