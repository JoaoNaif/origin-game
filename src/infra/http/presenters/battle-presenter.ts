import { BattleEngine } from '@/domain/combat/engine/battle-engine'
import { Battle } from '@/domain/combat/entities/battle'
import { BattleSide, MAX_ROUNDS } from '@/domain/combat/enums/battle-enums'
import {
  SnapshotSkill,
  SnapshotUnit,
} from '@/domain/combat/value-objects/battle-snapshot'

const skillView = (skill: SnapshotSkill) => ({
  key: skill.key,
  name: skill.name,
  lineage: skill.lineage,
  tier: skill.tier,
  target: skill.target,
  range: skill.range,
  area: skill.area,
  cooldown: skill.cooldown,
  desgastePercent: skill.desgastePercent,
  baseHitChance: skill.baseHitChance,
  isEnhanced: skill.isEnhanced,
  effects: skill.effects,
})

/** Skills que o inimigo já usou: o jogador só conhece as skills do outro lado vendo (`pvp_brief.md` 3). */
function revealedSkills(engine: BattleEngine): Map<string, Set<string>> {
  const seen = new Map<string, Set<string>>()

  for (const event of engine.events) {
    if (event.type !== 'SKILL') continue
    const keys = seen.get(event.ref) ?? new Set<string>()
    keys.add(event.skillKey)
    seen.set(event.ref, keys)
  }

  return seen
}

/**
 * A batalha como o jogador vê (o servidor é a autoridade, D9): nunca a seed (D33); do inimigo, classe, nível, traços
 * e o estado em campo, mas não os stats nem as skills que ele ainda não usou (`pvp_brief.md` 3).
 */
export class BattlePresenter {
  static toHTTP(battle: Battle, engine: BattleEngine) {
    const revealed = revealedSkills(engine)
    const ready = (ref: string) => new Set(engine.unit(ref).readySkills)
    const field = engine.activeField
    const fieldInfo = battle.snapshot.field.catalog.find(
      (f) => f.key === field.key
    )
    const turn = battle.isFinished ? null : engine.currentRef

    const unitView = (unit: SnapshotUnit, side: BattleSide) => {
      const state = engine.unit(unit.ref)
      const own = side === BattleSide.PLAYER
      const readyKeys = ready(unit.ref)
      const visibleSkills = own
        ? unit.skills
        : unit.skills.filter((s) => revealed.get(unit.ref)?.has(s.key))

      return {
        ref: unit.ref,
        side,
        characterId: own ? (unit.characterId ?? null) : null,
        name: unit.name,
        templateKey: unit.templateKey,
        characterClass: unit.characterClass,
        level: unit.level,
        traitKeys: unit.traitKeys,
        hp: state.hp,
        maxHp: state.maxHp,
        shield: state.shield,
        alive: state.alive,
        position: state.position,
        statuses: state.statuses,
        tauntedBy: state.tauntedBy,
        protectedBy: state.protectedBy,
        engaged: state.engaged,
        stats: own ? state.stats : null,
        skills: visibleSkills.map((s) => ({
          ...skillView(s),
          ready: readyKeys.has(s.key),
        })),
      }
    }

    return {
      id: battle.id.toString(),
      mode: battle.mode,
      status: battle.status,
      opponent: {
        name: battle.snapshot.opponent.name,
        profile: battle.aiProfile,
        difficulty: battle.aiDifficulty,
      },
      round: Math.min(engine.round, MAX_ROUNDS),
      turn: turn ? { ref: turn, side: engine.unit(turn).side } : null,
      timeline: battle.isFinished ? [] : engine.timeline(),
      field: {
        key: field.key,
        name: fieldInfo?.name ?? null,
        untilRound: field.untilRound,
        isInitial: field.key === (battle.snapshot.field.initial?.key ?? null),
      },
      fields: battle.snapshot.field.catalog.map((f) => ({
        key: f.key,
        name: f.name,
        requiredTraitKeys: f.requiredTraitKeys,
        primaryStat: f.primaryStat,
        secondaryStat: f.secondaryStat,
        primaryPercent: f.primaryPercent,
        secondaryPercent: f.secondaryPercent,
      })),
      units: [
        ...battle.snapshot.player.units.map((u) =>
          unitView(u, BattleSide.PLAYER)
        ),
        ...battle.snapshot.opponent.units.map((u) =>
          unitView(u, BattleSide.OPPONENT)
        ),
      ],
      result: battle.isFinished
        ? {
            winner: battle.winner,
            endReason: battle.endReason,
            rounds: battle.rounds,
            finishedAt: battle.finishedAt,
          }
        : null,
      startedAt: battle.startedAt,
    }
  }
}
