import { AwakeningHint } from '../enums/awakening-hint'
import { AwakeningMissionKind } from '../enums/awakening-mission-kind'
import {
  AwakeningBattleStats,
  AwakeningMissionProgress,
  AwakeningProgress,
} from '../value-objects/awakening-progress'

/** Condições das missões (D96, `awakening_brief.md` 7.2). */
export const AWAKENING_MISSION_RULES = {
  /** `DAMAGE_SHARE`: fração do dano da squad. */
  damageShare: 0.4,
  /** `SUPPORT_SHARE`: fração da cura e escudo da squad. */
  supportShare: 0.35,
  /** `MULTI_KILL`: abates numa batalha. */
  multiKill: 2,
  /** `TRIPLE_KILL`: abates numa batalha. */
  tripleKill: 3,
  /** `ENEMY_HP_SHARE`: fração do HP total inimigo causada numa batalha. */
  enemyHpShare: 0.6,
} as const

/** Quanto a batalha soma no progresso de cada tipo: eventos (acumulativa) ou 1 se a condição foi cumprida. */
export function missionGain(
  kind: AwakeningMissionKind,
  stats: AwakeningBattleStats
): number {
  const R = AWAKENING_MISSION_RULES
  const met = (condition: boolean) => (condition ? 1 : 0)

  switch (kind) {
    case 'KILLS':
      return stats.kills
    case 'STATUS_APPLIED':
      return stats.statusApplied
    case 'HEAVY_HITS':
      return stats.heavyHits
    case 'SUPPORT_ACTIONS':
      return stats.supportActions
    case 'DAMAGE_SHARE':
      return met(stats.damageShare >= R.damageShare)
    case 'SUPPORT_SHARE':
      return met(stats.supportShare >= R.supportShare)
    case 'LAST_ALIVE_WIN':
    case 'SOLE_SURVIVOR_WIN':
      return met(stats.lastAliveWin)
    case 'MULTI_KILL':
      return met(stats.kills >= R.multiKill)
    case 'ENEMY_HP_SHARE':
      return met(stats.enemyHpShare >= R.enemyHpShare)
    case 'TRIPLE_KILL':
      return met(stats.kills >= R.tripleKill)
  }
}

export const isMissionComplete = (mission: AwakeningMissionProgress) =>
  mission.progress >= mission.threshold

/** Soma a batalha nas missões, sem passar do limiar. */
export function advanceMissions(
  missions: readonly AwakeningMissionProgress[],
  stats: AwakeningBattleStats
): AwakeningMissionProgress[] {
  return missions.map((m) => ({
    ...m,
    progress: Math.min(m.threshold, m.progress + missionGain(m.kind, stats)),
  }))
}

/** A dica de proximidade (`awakening_brief.md` 3.3): 1 cumprida = Sinais, 2 = Iminente. */
export function awakeningHint(
  isAwakened: boolean,
  progress: AwakeningProgress | null
): AwakeningHint {
  if (isAwakened) return AwakeningHint.AWAKENED
  if (!progress) return AwakeningHint.SILENT

  const done = progress.missions.filter(isMissionComplete).length
  if (done >= 2) return AwakeningHint.IMMINENT
  if (done === 1) return AwakeningHint.SIGNS
  return AwakeningHint.SILENT
}
