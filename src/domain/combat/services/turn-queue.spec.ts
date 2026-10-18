import { SeededRng } from '@/core/rng/seeded-rng'
import { FixedRng } from 'test/fakes/fixed-rng'
import { VANGUARD_STATS } from 'test/factories/make-character-template'
import { describe, expect, it } from 'vitest'
import { QueueUnit, statAverage, TurnQueue } from './turn-queue'

const unit = (ref: string, speed: number, avg = 90): QueueUnit => ({
  ref,
  speed,
  statAverage: avg,
})

const order = (sut: TurnQueue, turns: number) =>
  Array.from({ length: turns }, () => sut.next().ref)

describe('Turn Queue', () => {
  it('should be able to act every 10 ticks with speed 100', () => {
    const sut = new TurnQueue([unit('A', 100)], new FixedRng())

    expect(sut.next()).toEqual({ ref: 'A', tick: 10, round: 1 })
    expect(sut.next()).toEqual({ ref: 'A', tick: 20, round: 2 })
  })

  it('should be able to keep the leftover after acting', () => {
    const sut = new TurnQueue([unit('A', 115)], new FixedRng())

    const first = sut.next()

    // 9 ticks × 115 = 1035 → age no tick 9 e sobram 35
    expect(first.tick).toBe(9)
    expect(sut.gaugeOf('A')).toBe(35)
  })

  it('should be able to give more turns to the faster unit', () => {
    const sut = new TurnQueue(
      [unit('EXECUTOR', 115), unit('ARTILLERY', 65)],
      new FixedRng()
    )

    const turns = order(sut, 60)
    const executor = turns.filter((t) => t === 'EXECUTOR').length
    const artillery = turns.filter((t) => t === 'ARTILLERY').length

    // 115 / 65 ≈ 1,77
    expect(executor / artillery).toBeCloseTo(115 / 65, 1)
  })

  it('should be able to let the one that crossed 1000 earlier in the tick act first', () => {
    // A mais lenta vem primeiro na lista, para provar que a ordem não vem da lista.
    const sut = new TurnQueue(
      [unit('SLOW', 105), unit('FAST', 110)],
      new FixedRng()
    )

    // Tick 10: os dois passam de 1000 (SLOW 1050, FAST 1100). No tick 9 estavam em 945 e 990:
    // FAST cruza 1000 em 10/110 do tick, SLOW em 55/105. FAST age primeiro, os dois no tick 10.
    expect(sut.next()).toMatchObject({ ref: 'FAST', tick: 10 })
    expect(sut.next()).toMatchObject({ ref: 'SLOW', tick: 10 })
  })

  it('should be able to break an exact tie by the stat average (D30)', () => {
    const sut = new TurnQueue(
      [unit('WEAK', 100, 80), unit('STRONG', 100, 95)],
      new FixedRng()
    )

    expect(order(sut, 2)).toEqual(['STRONG', 'WEAK'])
  })

  it('should be able to break a full tie with the seed', () => {
    const first = new TurnQueue(
      [unit('A', 100), unit('B', 100)],
      new FixedRng([0])
    )
    const second = new TurnQueue(
      [unit('A', 100), unit('B', 100)],
      new FixedRng([0.99])
    )

    expect(first.next().ref).toBe('A')
    expect(second.next().ref).toBe('B')
  })

  it('should be able to repeat the same order for the same seed', () => {
    const units = [unit('A', 100), unit('B', 100), unit('C', 50), unit('D', 75)]

    const sut = order(new TurnQueue(units, new SeededRng(7)), 40)

    expect(sut).toEqual(order(new TurnQueue(units, new SeededRng(7)), 40))
  })

  it('should be able to advance a turn without going past 1000', () => {
    const sut = new TurnQueue(
      [unit('ALLY', 100), unit('ENEMY', 100, 95)],
      new FixedRng()
    )
    sut.next() // ENEMY age no tick 10 (média maior)

    sut.shift('ALLY', 150)

    expect(sut.gaugeOf('ALLY')).toBe(1000)
    expect(sut.next()).toMatchObject({ ref: 'ALLY', tick: 10 })
  })

  it('should not be able to delay a turn below zero', () => {
    const sut = new TurnQueue([unit('A', 100)], new FixedRng())

    sut.shift('A', -70)

    expect(sut.gaugeOf('A')).toBe(0)
  })

  it('should be able to change speed gradually, keeping the bar', () => {
    const sut = new TurnQueue([unit('A', 100)], new FixedRng())
    sut.next()
    sut.setSpeed('A', 200)

    expect(sut.next().tick).toBe(15)
  })

  it('should be able to remove a defeated unit', () => {
    const sut = new TurnQueue([unit('A', 100), unit('B', 90)], new FixedRng())

    sut.remove('A')

    expect(order(sut, 3)).toEqual(['B', 'B', 'B'])
  })

  it('should not be able to accept a speed of zero', () => {
    expect(() => new TurnQueue([unit('A', 0)], new FixedRng())).toThrow()
  })

  describe('Rounds (D106)', () => {
    it('should be able to close the round when the slowest acts', () => {
      const sut = new TurnQueue(
        [unit('EXECUTOR', 115), unit('ARTILLERY', 65)],
        new FixedRng()
      )

      const turns = Array.from({ length: 5 }, () => sut.next())

      // Executor age 2 vezes na rodada 2 antes de a Artilharia fechar a rodada.
      expect(turns).toEqual([
        { ref: 'EXECUTOR', tick: 9, round: 1 },
        { ref: 'ARTILLERY', tick: 16, round: 1 },
        { ref: 'EXECUTOR', tick: 18, round: 2 },
        { ref: 'EXECUTOR', tick: 27, round: 2 },
        { ref: 'ARTILLERY', tick: 31, round: 2 },
      ])
      expect(sut.currentRound).toBe(3)
    })

    it('should be able to close the round when the last one missing is defeated', () => {
      const sut = new TurnQueue(
        [unit('FAST', 110), unit('MID', 90), unit('SLOW', 60)],
        new FixedRng()
      )
      sut.next() // FAST
      sut.next() // MID

      sut.remove('SLOW')

      expect(sut.currentRound).toBe(2)
      expect(sut.next().round).toBe(2)
    })

    it('should not be able to close the round before a newcomer acts', () => {
      const sut = new TurnQueue([unit('A', 100)], new FixedRng())
      sut.next() // A fecha a rodada 1 sozinha

      sut.add(unit('BEAST', 50))
      sut.next() // A de novo, na rodada 2

      expect(sut.currentRound).toBe(2)
    })
  })

  it('should be able to average stats on the budget scale', () => {
    // Vanguarda: orçamento 670 / 7
    expect(statAverage(VANGUARD_STATS)).toBeCloseTo(670 / 7)
  })
})
