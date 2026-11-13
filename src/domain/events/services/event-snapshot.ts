import {
  BattleRules,
  BattleSnapshot,
  SnapshotSide,
} from '@/domain/combat/value-objects/battle-snapshot'
import { EventModifier } from '../value-objects/event-modifier'

/**
 * Aplica os modificadores da pesquisa (D155, `events_brief.md` 5.2) na foto da batalha: os stats nivelados trocam o
 * nível das unidades dos dois lados (o motor deriva os stats do nível) e o resto vira `rules`, que o motor lê. A foto
 * fica gravada na batalha, então o replay sai igual.
 */
export function applyEventModifiers(
  snapshot: BattleSnapshot,
  modifiers: readonly EventModifier[]
): BattleSnapshot {
  if (modifiers.length === 0) return snapshot

  const rules: BattleRules = {}
  let level: number | null = null
  for (const modifier of modifiers) {
    switch (modifier.type) {
      case 'LEVELED_STATS':
        level = modifier.level
        break
      case 'EARLY_EXHAUSTION':
        rules.exhaustionAfterRound = modifier.afterRound
        break
      case 'NO_HEALING':
        rules.noHealing = true
        break
      case 'EQUAL_SPEED':
        rules.equalSpeed = true
        break
    }
  }

  const leveled = (side: SnapshotSide): SnapshotSide =>
    level === null
      ? side
      : { ...side, units: side.units.map((u) => ({ ...u, level: level! })) }

  return {
    ...snapshot,
    player: leveled(snapshot.player),
    opponent: leveled(snapshot.opponent),
    ...(Object.keys(rules).length > 0 ? { rules } : {}),
  }
}
