import { describe, expect, it } from 'vitest'
import { UniqueEntityId } from '@/core/entities/unique-entity-id'
import { AwakeningBattleStats } from '../value-objects/awakening-progress'
import {
  advanceMissions,
  awakeningHint,
  missionGain,
} from './awakening-missions'

const stats = (
  override: Partial<AwakeningBattleStats> = {}
): AwakeningBattleStats => ({
  kills: 0,
  statusApplied: 0,
  heavyHits: 0,
  supportActions: 0,
  damageShare: 0,
  supportShare: 0,
  lastAliveWin: false,
  enemyHpShare: 0,
  ...override,
})

describe('Awakening Missions', () => {
  it('should be able to add events to the accumulative missions', () => {
    const battle = stats({ kills: 2, statusApplied: 3, heavyHits: 1 })

    expect(missionGain('KILLS', battle)).toBe(2)
    expect(missionGain('STATUS_APPLIED', battle)).toBe(3)
    expect(missionGain('HEAVY_HITS', battle)).toBe(1)
    expect(missionGain('SUPPORT_ACTIONS', battle)).toBe(0)
  })

  it('should be able to count a battle only when the condition is met', () => {
    expect(missionGain('DAMAGE_SHARE', stats({ damageShare: 0.4 }))).toBe(1)
    expect(missionGain('DAMAGE_SHARE', stats({ damageShare: 0.39 }))).toBe(0)
    expect(missionGain('SUPPORT_SHARE', stats({ supportShare: 0.35 }))).toBe(1)
    expect(missionGain('MULTI_KILL', stats({ kills: 2 }))).toBe(1)
    expect(missionGain('TRIPLE_KILL', stats({ kills: 2 }))).toBe(0)
    expect(missionGain('TRIPLE_KILL', stats({ kills: 3 }))).toBe(1)
    expect(missionGain('ENEMY_HP_SHARE', stats({ enemyHpShare: 0.6 }))).toBe(1)
    expect(missionGain('LAST_ALIVE_WIN', stats({ lastAliveWin: true }))).toBe(1)
    expect(
      missionGain('SOLE_SURVIVOR_WIN', stats({ lastAliveWin: true }))
    ).toBe(1)
  })

  it('should be able to advance missions without passing the threshold', () => {
    const missions = advanceMissions(
      [
        { kind: 'KILLS', threshold: 100, progress: 99 },
        { kind: 'MULTI_KILL', threshold: 15, progress: 3 },
      ],
      stats({ kills: 4 })
    )

    expect(missions.map((m) => m.progress)).toEqual([100, 4])
  })

  it('should be able to give a hint by how many missions are done', () => {
    const progress = (done: number) => ({
      awakeningId: new UniqueEntityId(),
      drawnAt: new Date(),
      missions: [0, 1, 2].map((i) => ({
        kind: 'KILLS' as const,
        threshold: 1,
        progress: i < done ? 1 : 0,
      })),
    })

    expect(awakeningHint(false, null)).toBe('SILENT')
    expect(awakeningHint(false, progress(0))).toBe('SILENT')
    expect(awakeningHint(false, progress(1))).toBe('SIGNS')
    expect(awakeningHint(false, progress(2))).toBe('IMMINENT')
    expect(awakeningHint(true, progress(3))).toBe('AWAKENED')
  })
})
