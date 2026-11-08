import { DomPillar } from '@/domain/characters/enums/dom-pillar'
import { DomRole } from '@/domain/characters/enums/dom-role'
import { DomFeat } from '@/domain/characters/value-objects/dom-state'
import { AiDifficulty } from '@/domain/ai/enums/ai-difficulty'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { StatusType } from '@/domain/skills/enums/status-type'
import { BattleEvent } from '../engine/battle-events'
import { BattleSide } from '../enums/battle-enums'

/** Peso de cada batalha na janela do DOM (D93, `dom_brief.md` 8.2). No MVP só há PvE. */
export const DOM_PVE_WEIGHT: Record<AiDifficulty, number> = {
  BEGINNER: 0.15,
  INTERMEDIATE: 0.3,
  ADVANCED: 0.4,
  MASTER: 0.5,
  GRANDMASTER: 0.6,
}

/** Números dos feitos (`dom_brief.md` 4.1 e 8.3, D152). */
export const DOM_FEAT_RULES = {
  /** Mente / dano: skills que causaram dano em alvo Marcado ou Exposto. */
  markedHits: 3,
  /** Mente / tank: ataques esquivados. */
  dodges: 3,
  /** Coração / dano: HP abaixo desta fração no golpe que encerra a batalha. */
  lowHpShare: 0.2,
  /** Coração / tank: rodadas como o alvo mais atacado da squad. */
  mostAttackedRounds: 5,
  /** Coração / suporte: cura em aliados, em frações do próprio HP máximo. */
  healShare: 1,
  /** Coração / controle: vivos a menos que o inimigo em algum momento. */
  disadvantage: 2,
  /** Corpo / dano: abates na mesma rodada com skills de alvo único. */
  roundKills: 2,
  /** Corpo / tank: fração do dano inimigo recebido. */
  damageTakenShare: 0.5,
  /** Corpo / suporte: aliados diferentes salvos pelo escudo dele. */
  shieldSaves: 2,
  /**
   * Corpo / controle: turnos seguidos do mesmo inimigo sob controle dele (perdeu o turno por Atordoado ou Adormecido,
   * começou o turno Preso ou foi Travado desde o turno anterior).
   */
  controlledTurns: 2,
  /** Aura / controle: debuffs num mesmo inimigo antes de ele perder um turno. */
  debuffsBeforeSkip: 3,
} as const

const sideOf = (ref: string) =>
  ref.startsWith(BattleSide.PLAYER) ? BattleSide.PLAYER : BattleSide.OPPONENT

export interface DomFeatsUnit {
  ref: string
  level: number
}

export interface DomFeatsEnd {
  alive: boolean
  hp: number
  maxHp: number
}

export interface DomFeatsInput {
  events: readonly BattleEvent[]
  side: BattleSide
  /** As unidades dos dois lados (nível do snapshot). */
  units: readonly DomFeatsUnit[]
  won: boolean
  /** Como cada unidade terminou. */
  end: (ref: string) => DomFeatsEnd
  /** Área da skill usada (pela `key` do evento `SKILL`); `null` se não achar. */
  areaOf: (ref: string, skillKey: string) => SkillArea | null
}

class Counter<K> extends Map<K, number> {
  add(key: K, amount = 1) {
    this.set(key, (this.get(key) ?? 0) + amount)
  }

  of(key: K) {
    return this.get(key) ?? 0
  }
}

/**
 * Feitos do DOM que cada unidade de um lado cumpriu na batalha (`dom_brief.md` 4.1 e 8.3, D152). Todos exigem vencer.
 * Devolve todos os cumpridos (pode haver mais de um por pilar; a escolha de 1 por pilar é do `recordDomBattle`).
 */
export function domBattleFeats(input: DomFeatsInput): Map<string, DomFeat[]> {
  const { side, events } = input
  const ourRefs = input.units
    .filter((u) => sideOf(u.ref) === side)
    .map((u) => u.ref)
  const enemyRefs = input.units
    .filter((u) => sideOf(u.ref) !== side)
    .map((u) => u.ref)
  const feats = new Map<string, DomFeat[]>(ourRefs.map((ref) => [ref, []]))
  if (!input.won) return feats

  const level = new Map(input.units.map((u) => [u.ref, u.level]))
  const ours = (ref: string | undefined): ref is string =>
    ref !== undefined && sideOf(ref) === side
  const enemy = (ref: string | undefined): ref is string =>
    ref !== undefined && sideOf(ref) !== side
  const grant = (ref: string, pillar: DomPillar, role: DomRole) => {
    const list = feats.get(ref)
    if (list && !list.some((f) => f.pillar === pillar && f.role === role)) {
      list.push({ pillar, role })
    }
  }

  const alive = new Set(input.units.map((u) => u.ref))
  const aliveCount = (s: 'ours' | 'enemy') =>
    (s === 'ours' ? ourRefs : enemyRefs).filter((r) => alive.has(r)).length

  // golpe em resolução
  let skill: { ref: string; area: SkillArea | null; marked: boolean } | null =
    null
  let round = 1
  const lastHitBy = new Map<string, string>()
  const lastHitSingle = new Map<string, boolean>()
  let lastEnemyKiller: string | null = null

  // Mente
  const markedHits = new Counter<string>()
  const dodges = new Counter<string>()
  const buffedBy = new Map<string, Set<string>>()
  let roundDebuffs = new Map<string, Set<string>>()
  let roundDamaged = new Set<string>()

  // Coração
  let roundAttacks = new Counter<string>()
  const mostAttacked = new Counter<string>()
  const healed = new Counter<string>()
  let disadvantaged = false

  // Corpo
  let roundKills = new Counter<string>()
  const roundKillFeat = new Set<string>()
  const damageTaken = new Counter<string>()
  const lastShielder = new Map<string, string>()
  let pendingSaves: { shielder: string; ally: string }[] = []
  const saves = new Map<string, Set<string>>()
  const lastApplier = new Map<string, string>()
  const lockersSince = new Map<string, Set<string>>()
  const turnControl = new Map<string, Set<string>>()
  const prevControl = new Map<string, Set<string>>()

  // Aura
  const debuffs = new Map<string, Counter<string>>()

  const closeTurnOf = (ref: string) => {
    const current = turnControl.get(ref)
    if (!current) return
    const previous = prevControl.get(ref)
    for (const by of current) {
      if (previous?.has(by)) grant(by, DomPillar.BODY, DomRole.CONTROL)
    }
    prevControl.set(ref, current)
    turnControl.delete(ref)
  }

  const closeRound = () => {
    // Mente / controle: debuff em todos os inimigos vivos, sem levar dano na rodada
    const enemiesAlive = enemyRefs.filter((r) => alive.has(r))
    for (const [by, targets] of roundDebuffs) {
      if (
        enemiesAlive.length > 0 &&
        !roundDamaged.has(by) &&
        enemiesAlive.every((r) => targets.has(r))
      ) {
        grant(by, DomPillar.MIND, DomRole.CONTROL)
      }
    }
    // Coração / tank: o mais atacado da squad (empate: todos os empatados)
    const top = Math.max(0, ...roundAttacks.values())
    if (top > 0) {
      for (const [ref, count] of roundAttacks) {
        if (count === top) mostAttacked.add(ref)
      }
    }
    // Corpo / suporte: o aliado salvo pelo escudo terminou a rodada vivo
    for (const save of pendingSaves) {
      if (!alive.has(save.ally)) continue
      const set = saves.get(save.shielder) ?? new Set<string>()
      set.add(save.ally)
      saves.set(save.shielder, set)
    }
    roundDebuffs = new Map()
    roundDamaged = new Set()
    roundAttacks = new Counter()
    roundKills = new Counter()
    pendingSaves = []
  }

  const recordDebuff = (by: string, target: string) => {
    const set = roundDebuffs.get(by) ?? new Set<string>()
    set.add(target)
    roundDebuffs.set(by, set)
    const perTarget = debuffs.get(by) ?? new Counter<string>()
    perTarget.add(target)
    debuffs.set(by, perTarget)
  }

  for (const event of events) {
    switch (event.type) {
      case 'TURN': {
        if (event.round !== round) {
          closeRound()
          round = event.round
        }
        skill = null
        buffedBy.delete(event.ref)
        if (event.extra) break
        if (enemy(event.ref)) {
          closeTurnOf(event.ref)
          const control = new Set<string>(lockersSince.get(event.ref) ?? [])
          lockersSince.delete(event.ref)
          if (event.statuses?.includes(StatusType.ROOT)) {
            const by = lastApplier.get(`${event.ref}|${StatusType.ROOT}`)
            if (ours(by)) control.add(by)
          }
          turnControl.set(event.ref, control)
        }
        break
      }

      case 'SKIP': {
        if (!enemy(event.ref)) break
        const by = lastApplier.get(`${event.ref}|${event.reason}`)
        if (ours(by)) turnControl.get(event.ref)?.add(by)
        // Aura / controle: 3 debuffs dele no alvo, que depois perde o turno
        for (const [debuffer, perTarget] of debuffs) {
          if (perTarget.of(event.ref) >= DOM_FEAT_RULES.debuffsBeforeSkip) {
            grant(debuffer, DomPillar.AURA, DomRole.CONTROL)
          }
        }
        break
      }

      case 'SKILL':
        skill = {
          ref: event.ref,
          area: input.areaOf(event.ref, event.skillKey),
          marked: false,
        }
        break

      case 'MISS':
        if (enemy(event.ref) && ours(event.targetRef)) {
          dodges.add(event.targetRef)
          roundAttacks.add(event.targetRef)
        }
        break

      case 'DAMAGE': {
        if (sideOf(event.ref) === sideOf(event.targetRef)) break
        const dealt = event.amount + event.shieldAbsorbed
        lastHitBy.set(event.targetRef, event.ref)
        lastHitSingle.set(
          event.targetRef,
          !event.linked &&
            skill?.ref === event.ref &&
            skill.area === SkillArea.SINGLE
        )

        if (ours(event.ref) && skill?.ref === event.ref && !skill.marked) {
          const statuses = event.targetStatuses ?? []
          if (
            dealt > 0 &&
            (statuses.includes(StatusType.MARK) ||
              statuses.includes(StatusType.EXPOSE))
          ) {
            skill.marked = true
            markedHits.add(event.ref)
          }
        }

        if (ours(event.targetRef)) {
          if (!event.linked) roundAttacks.add(event.targetRef)
          damageTaken.add(event.targetRef, dealt)
          if (dealt > 0) roundDamaged.add(event.targetRef)
          const shielder = lastShielder.get(event.targetRef)
          const hpLeft = event.hpLeft ?? 0
          if (
            shielder &&
            hpLeft > 0 &&
            event.shieldAbsorbed > 0 &&
            event.shieldAbsorbed >= hpLeft
          ) {
            pendingSaves.push({ shielder, ally: event.targetRef })
          }
        }
        break
      }

      case 'DOT':
        if (ours(event.ref) && event.amount > 0) {
          damageTaken.add(event.ref, event.amount)
          roundDamaged.add(event.ref)
        }
        break

      case 'HEAL':
        if (
          ours(event.ref) &&
          ours(event.targetRef) &&
          event.ref !== event.targetRef
        ) {
          healed.add(event.ref, event.amount)
        }
        break

      case 'SHIELD':
        if (
          ours(event.ref) &&
          ours(event.targetRef) &&
          event.ref !== event.targetRef &&
          event.amount > 0
        ) {
          lastShielder.set(event.targetRef, event.ref)
        }
        break

      case 'MODIFIER':
        if (!event.ref) break
        if (
          ours(event.ref) &&
          enemy(event.targetRef) &&
          event.percent < 0 &&
          ['ADDED', 'RENEWED', 'REPLACED'].includes(event.result)
        ) {
          recordDebuff(event.ref, event.targetRef)
        }
        if (
          ours(event.ref) &&
          ours(event.targetRef) &&
          event.ref !== event.targetRef &&
          event.percent > 0 &&
          ['ADDED', 'RENEWED', 'REPLACED'].includes(event.result)
        ) {
          const set = buffedBy.get(event.ref) ?? new Set<string>()
          set.add(event.targetRef)
          buffedBy.set(event.ref, set)
        }
        break

      case 'STATUS':
        if (!event.ref) break
        if (event.result === 'APPLIED' || event.result === 'RENEWED') {
          lastApplier.set(`${event.targetRef}|${event.status}`, event.ref)
          if (ours(event.ref) && enemy(event.targetRef)) {
            recordDebuff(event.ref, event.targetRef)
          }
        }
        break

      case 'LOCK':
        if (event.ref && ours(event.ref) && enemy(event.targetRef)) {
          recordDebuff(event.ref, event.targetRef)
          const set = lockersSince.get(event.targetRef) ?? new Set<string>()
          set.add(event.ref)
          lockersSince.set(event.targetRef, set)
        }
        break

      case 'DEFEATED': {
        alive.delete(event.ref)
        if (
          aliveCount('ours') - aliveCount('enemy') <=
          -DOM_FEAT_RULES.disadvantage
        ) {
          disadvantaged = true
        }
        if (!enemy(event.ref)) break

        const killer = lastHitBy.get(event.ref)
        lastEnemyKiller = killer ?? null
        if (!ours(killer)) break

        // Mente / suporte: aliado que ele buffou abate antes do próximo turno dele
        for (const [buffer, allies] of buffedBy) {
          if (allies.has(killer)) grant(buffer, DomPillar.MIND, DomRole.SUPPORT)
        }
        // Corpo / dano: 2 abates na mesma rodada com skills de alvo único
        if (lastHitSingle.get(event.ref)) {
          roundKills.add(killer)
          if (roundKills.of(killer) >= DOM_FEAT_RULES.roundKills) {
            roundKillFeat.add(killer)
          }
        }
        // Aura / dano: abate de inimigo de nível maior
        if ((level.get(event.ref) ?? 0) > (level.get(killer) ?? 0)) {
          grant(killer, DomPillar.AURA, DomRole.DAMAGE)
        }
        break
      }
    }
  }

  closeRound()
  for (const ref of enemyRefs) closeTurnOf(ref)

  const totalTaken = ourRefs.reduce((sum, r) => sum + damageTaken.of(r), 0)
  const average = (refs: string[]) =>
    refs.reduce((sum, r) => sum + (level.get(r) ?? 0), 0) /
    Math.max(1, refs.length)
  const strongerEnemy = average(enemyRefs) > average(ourRefs)
  const eliminated = enemyRefs.every((r) => !alive.has(r))

  for (const ref of ourRefs) {
    const end = input.end(ref)

    if (markedHits.of(ref) >= DOM_FEAT_RULES.markedHits) {
      grant(ref, DomPillar.MIND, DomRole.DAMAGE)
    }
    if (dodges.of(ref) >= DOM_FEAT_RULES.dodges) {
      grant(ref, DomPillar.MIND, DomRole.TANK)
    }
    if (
      eliminated &&
      lastEnemyKiller === ref &&
      end.alive &&
      end.hp < end.maxHp * DOM_FEAT_RULES.lowHpShare
    ) {
      grant(ref, DomPillar.HEART, DomRole.DAMAGE)
    }
    if (
      end.alive &&
      mostAttacked.of(ref) >= DOM_FEAT_RULES.mostAttackedRounds
    ) {
      grant(ref, DomPillar.HEART, DomRole.TANK)
    }
    if (end.alive && healed.of(ref) >= end.maxHp * DOM_FEAT_RULES.healShare) {
      grant(ref, DomPillar.HEART, DomRole.SUPPORT)
    }
    if (end.alive && disadvantaged) {
      grant(ref, DomPillar.HEART, DomRole.CONTROL)
    }
    if (roundKillFeat.has(ref)) grant(ref, DomPillar.BODY, DomRole.DAMAGE)
    if (
      totalTaken > 0 &&
      damageTaken.of(ref) / totalTaken > DOM_FEAT_RULES.damageTakenShare
    ) {
      grant(ref, DomPillar.BODY, DomRole.TANK)
    }
    if ((saves.get(ref)?.size ?? 0) >= DOM_FEAT_RULES.shieldSaves) {
      grant(ref, DomPillar.BODY, DomRole.SUPPORT)
    }
    if (strongerEnemy && end.alive) {
      grant(ref, DomPillar.AURA, DomRole.TANK)
    }
    if (strongerEnemy && ourRefs.every((r) => alive.has(r))) {
      grant(ref, DomPillar.AURA, DomRole.SUPPORT)
    }
  }

  return feats
}
