import { Either, left, right } from '@/core/either'
import { Rng } from '@/core/rng/rng'
import { Stat } from '@/domain/characters/enums/stat'
import { computeStats } from '@/domain/characters/services/stat-calculator'
import { StatBlock } from '@/domain/characters/value-objects/stat-block'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { StatusType } from '@/domain/skills/enums/status-type'
import { SkillEffect } from '@/domain/skills/value-objects/skill-effect'
import { GridPosition } from '@/domain/squads/value-objects/grid-position'
import { BattleSide, MAX_ROUNDS } from '../enums/battle-enums'
import { InvalidActionError } from '../errors/invalid-action-error'
import { BattleActionPayload } from '../value-objects/battle-action'
import {
  BattleSnapshot,
  SnapshotSkill,
  SnapshotUnit,
} from '../value-objects/battle-snapshot'
import {
  BattleOutcome,
  checkElimination,
  damageMultiplier,
  forcedEnd,
  healMultiplier,
  SideSummary,
} from '../services/battle-end'
import { BattleGrid, FORCED_MOVE_BASE_CHANCE } from '../services/battle-grid'
import { STATUS_RULES, UnitConditions } from '../services/conditions'
import { SkillCooldowns } from '../services/cooldowns'
import {
  applyDamage,
  baseDamage,
  effectivePower,
  finalDamage,
  healAmount,
} from '../services/damage'
import { defend } from '../services/defend'
import { DesgasteState, RELIEF } from '../services/desgaste'
import { hitChance, roll, statusChance } from '../services/hit'
import { InterceptState } from '../services/intercept'
import { resolveTargets, TargetHit } from '../services/targeting'
import { statAverage, Turn, TurnQueue } from '../services/turn-queue'
import { BattleEvent } from './battle-events'

/** Estado de uma unidade durante a batalha. */
interface EngineUnit {
  ref: string
  side: BattleSide
  snapshot: SnapshotUnit
  /** Stats fora de batalha (base do Desgaste). */
  base: StatBlock
  startingMaxHp: number
  hp: number
  shield: number
  alive: boolean
  desgaste: DesgasteState
  conditions: UnitConditions
  cooldowns: SkillCooldowns
  /** Trocou de lugar com um aliado por ação: perde a próxima ação (D42). */
  skipNext: boolean
  /** Já foi atrasado: imune a novo atraso até agir (D102). */
  delayImmune: boolean
}

/** Vez de agir devolvida por `nextTurn`. */
export interface ActorTurn {
  ref: string
  side: BattleSide
  round: number
  tick: number
}

const other = (side: BattleSide) =>
  side === BattleSide.PLAYER ? BattleSide.OPPONENT : BattleSide.PLAYER

/**
 * Motor da batalha (`engine.md` 3.10). Recebe o snapshot e a `Rng` da seed e roda turno a turno, juntando as peças:
 * fila, acerto, dano, Desgaste, alvos, status, recarga, Defender, Interceptar, movimento, Exaustão e fim.
 * Determinístico: mesmo snapshot + mesma seed + mesmas ações = mesmos eventos (D8).
 *
 * Uso: `nextTurn()` diz de quem é a vez (já resolvendo dano contínuo e Atordoado); `act(payload)` executa a ação
 * dessa unidade. Quando acaba, `outcome` fica preenchido.
 */
export class BattleEngine {
  private readonly units = new Map<string, EngineUnit>()
  private readonly grids: Record<BattleSide, BattleGrid>
  private readonly intercepts: Record<BattleSide, InterceptState> = {
    PLAYER: new InterceptState(),
    OPPONENT: new InterceptState(),
  }
  /** Ordem dos Guardiões de cada lado, fixa pela seed no início (D102). */
  private readonly guardianOrder: Record<BattleSide, string[]>
  private readonly queue: TurnQueue
  private current: Turn | null = null
  private result: BattleOutcome | null = null
  private readonly log: BattleEvent[] = []

  constructor(
    snapshot: BattleSnapshot,
    private readonly rng: Rng
  ) {
    for (const side of [snapshot.player, snapshot.opponent]) {
      for (const unit of side.units) {
        this.units.set(unit.ref, createUnit(unit, side.side))
      }
    }

    this.grids = {
      PLAYER: new BattleGrid(snapshot.player.units),
      OPPONENT: new BattleGrid(snapshot.opponent.units),
    }

    this.queue = new TurnQueue(
      [...this.units.values()].map((u) => ({
        ref: u.ref,
        speed: this.stat(u, Stat.SPEED),
        statAverage: statAverage(u.base),
      })),
      rng
    )

    this.guardianOrder = {
      PLAYER: this.shuffledGuardians(BattleSide.PLAYER),
      OPPONENT: this.shuffledGuardians(BattleSide.OPPONENT),
    }
  }

  /** Resultado, quando a batalha acabou. */
  get outcome(): BattleOutcome | null {
    return this.result
  }

  get events(): readonly BattleEvent[] {
    return this.log
  }

  get round(): number {
    return this.queue.currentRound
  }

  /** Visão de leitura de uma unidade (HP, escudo, posição, vivo). */
  unit(ref: string) {
    const unit = this.get(ref)

    return {
      ref: unit.ref,
      side: unit.side,
      hp: unit.hp,
      maxHp: unit.desgaste.maxHp,
      shield: unit.shield,
      alive: unit.alive,
      position: unit.alive ? this.grids[unit.side].positionOf(ref) : null,
      stats: Object.fromEntries(
        Object.values(Stat).map((s) => [s, this.stat(unit, s)])
      ) as StatBlock,
      readySkills: unit.cooldowns.ready().map((s) => s.key),
    }
  }

  /** Unidades vivas de um lado. */
  aliveRefs(side: BattleSide): string[] {
    return [...this.units.values()]
      .filter((u) => u.side === side && u.alive)
      .map((u) => u.ref)
  }

  /**
   * Avança até a próxima unidade que precisa decidir. Resolve sozinho o início do turno (dano contínuo, Atordoado,
   * ação perdida pela troca) e os turnos perdidos. Devolve `null` quando a batalha acabou.
   */
  nextTurn(): ActorTurn | null {
    while (!this.result) {
      if (this.current) {
        const unit = this.get(this.current.ref)
        return {
          ref: unit.ref,
          side: unit.side,
          round: this.current.round,
          tick: this.current.tick,
        }
      }

      const turn = this.queue.next()
      const unit = this.get(turn.ref)
      this.log.push({
        type: 'TURN',
        ref: unit.ref,
        round: turn.round,
        tick: turn.tick,
      })

      const start = unit.conditions.startTurn(unit.desgaste.maxHp)
      if (start.dotDamage > 0) {
        const damage = applyDamage(start.dotDamage, unit)
        this.setHp(unit, damage.hpLeft, damage.shieldLeft)
        this.log.push({ type: 'DOT', ref: unit.ref, amount: start.dotDamage })
      }

      if (!unit.alive) {
        this.afterAction()
        continue
      }

      if (start.skipAction || unit.skipNext) {
        this.log.push({
          type: 'SKIP',
          ref: unit.ref,
          reason: start.skipAction ? 'STUN' : 'SWAPPED',
        })
        unit.skipNext = false
        this.endTurn(unit)
        continue
      }

      this.refreshSpeeds()
      this.current = turn
    }

    return null
  }

  /** Executa a ação da unidade da vez. Ação inválida não muda nada e devolve o erro. */
  act(payload: BattleActionPayload): Either<InvalidActionError, BattleEvent[]> {
    if (this.result)
      return left(new InvalidActionError('a batalha já terminou'))
    if (!this.current)
      return left(new InvalidActionError('chame nextTurn antes'))

    const actor = this.get(this.current.ref)
    const from = this.log.length

    const done = this.perform(actor, payload)
    if (done.isLeft()) return left(done.value)

    this.endTurn(actor)

    return right(this.log.slice(from))
  }

  // ---------------------------------------------------------------------------
  // Ações
  // ---------------------------------------------------------------------------

  private perform(
    actor: EngineUnit,
    payload: BattleActionPayload
  ): Either<InvalidActionError, void> {
    switch (payload.type) {
      case 'DEFEND':
        defend(actor.conditions, actor.desgaste)
        this.log.push({ type: 'DEFEND', ref: actor.ref })
        return right(undefined)

      case 'MOVE': {
        const moved = this.grids[actor.side].move(
          actor.ref,
          payload.to,
          actor.conditions.canBeMoved
        )
        if (moved.isLeft())
          return left(new InvalidActionError(moved.value.message))
        this.log.push({
          type: 'MOVE',
          ref: actor.ref,
          to: payload.to,
          forced: false,
        })
        return right(undefined)
      }

      case 'SWAP': {
        const ally = this.units.get(payload.withRef)
        if (
          !ally?.alive ||
          ally.side !== actor.side ||
          ally.ref === actor.ref
        ) {
          return left(new InvalidActionError('troca só com aliado vivo'))
        }
        const swapped = this.grids[actor.side].swap(actor.ref, ally.ref, {
          a: actor.conditions.canBeMoved,
          b: ally.conditions.canBeMoved,
        })
        if (swapped.isLeft())
          return left(new InvalidActionError(swapped.value.message))
        ally.skipNext = true // os dois perdem a ação (D42)
        this.log.push({
          type: 'MOVE',
          ref: actor.ref,
          to: this.grids[actor.side].positionOf(actor.ref),
          forced: false,
        })
        return right(undefined)
      }

      case 'SKILL':
        return this.useSkill(actor, payload)
    }
  }

  private useSkill(
    actor: EngineUnit,
    payload: Extract<BattleActionPayload, { type: 'SKILL' }>
  ): Either<InvalidActionError, void> {
    const skill = actor.snapshot.skills.find((s) => s.key === payload.skillKey)
    if (!skill) return left(new InvalidActionError('skill fora da build'))
    if (!actor.cooldowns.isReady(skill.key)) {
      return left(new InvalidActionError('skill em recarga'))
    }

    const targetSide =
      skill.target === SkillTarget.ENEMY ? other(actor.side) : actor.side
    if (
      skill.target !== SkillTarget.SELF &&
      payload.targetSide !== targetSide
    ) {
      return left(new InvalidActionError('lado alvo errado para essa skill'))
    }

    const grid = this.grids[targetSide]
    const exposedRefs = new Set(
      grid
        .units()
        .map((u) => u.ref)
        .filter((ref) => this.get(ref).conditions.isExposed)
    )
    const targets = resolveTargets({
      skill,
      actor: {
        ref: actor.ref,
        ...this.grids[actor.side].positionOf(actor.ref),
      },
      units: grid.units(),
      cell: payload.target,
      exposedRefs,
    })
    if (targets.isLeft())
      return left(new InvalidActionError(targets.value.message))

    const potency = actor.desgaste.potencyFor(skill, actor.hp)
    this.log.push({
      type: 'SKILL',
      ref: actor.ref,
      skillKey: skill.key,
      potency,
    })

    const hits = this.applyIntercept(skill, targets.value, payload.target)
    let producedEffect = false

    for (const hit of hits) {
      const target = this.get(hit.ref)
      if (!target.alive) continue

      if (skill.baseHitChance !== null) {
        const chance = hitChance(
          skill.baseHitChance,
          this.stat(actor, Stat.PRECISION),
          this.stat(target, Stat.EVASION)
        )
        if (!roll(this.rng, chance)) {
          this.log.push({ type: 'MISS', ref: actor.ref, targetRef: target.ref })
          continue
        }
      }

      producedEffect = true
      for (const effect of skill.effects) {
        if (effect.appliesTo === 'SELF') continue
        this.applyEffect(
          actor,
          target,
          skill,
          effect,
          potency,
          hit.falloff,
          payload
        )
      }
    }

    if (producedEffect) {
      for (const effect of skill.effects) {
        if (effect.appliesTo === 'SELF') {
          this.applyEffect(actor, actor, skill, effect, potency, 1, payload)
        }
      }

      const charge = actor.desgaste.charge(skill, actor.hp)
      if (charge.selfDamage > 0) {
        this.setHp(actor, actor.hp - charge.selfDamage, actor.shield)
      }
      this.clampToMaxHp(actor)
      this.log.push({
        type: 'DESGASTE',
        ref: actor.ref,
        selfDamage: charge.selfDamage,
      })
    }

    // recarga vale mesmo errando (errar já custou turno e recarga, 9.4b)
    actor.cooldowns.use(skill.key)

    return right(undefined)
  }

  /** Interceptar do Guardião (D102): desvia um golpe de alvo único para o Guardião adjacente. */
  private applyIntercept(
    skill: SnapshotSkill,
    hits: TargetHit[],
    cell: GridPosition
  ): TargetHit[] {
    if (skill.target !== SkillTarget.ENEMY || hits.length !== 1) return hits

    const target = this.get(hits[0].ref)
    const grid = this.grids[target.side]
    const guardians = this.guardianOrder[target.side]
      .map((ref) => this.get(ref))
      .filter((g) => g.alive)
      .map((g) => ({
        ref: g.ref,
        characterClass: g.snapshot.characterClass,
        ...grid.positionOf(g.ref),
        canAct: !g.conditions.has(StatusType.STUN) && g.conditions.canBeMoved,
      }))

    const guardianRef = this.intercepts[target.side].intercept(
      {
        targetRef: target.ref,
        targetCell: grid.positionOf(target.ref) ?? cell,
        range: skill.range,
        area: skill.area,
      },
      guardians,
      this.queue.currentRound
    )
    if (!guardianRef) return hits

    this.log.push({ type: 'INTERCEPT', guardianRef, protectedRef: target.ref })

    return [{ ref: guardianRef, falloff: hits[0].falloff }]
  }

  private applyEffect(
    actor: EngineUnit,
    target: EngineUnit,
    skill: SnapshotSkill,
    effect: SkillEffect,
    potency: number,
    falloff: number,
    payload: Extract<BattleActionPayload, { type: 'SKILL' }>
  ) {
    if (!target.alive) return
    const round = this.current?.round ?? this.queue.currentRound

    switch (effect.type) {
      case 'DAMAGE': {
        const power = effectivePower(effect.power, skill.isEnhanced) * potency
        const raw =
          baseDamage(
            power,
            this.stat(actor, Stat.ATTACK),
            this.stat(target, Stat.DEFENSE)
          ) *
          falloff *
          damageMultiplier(round) *
          target.conditions.damageTakenMultiplier *
          traitDamageMultiplier(actor, skill.range)
        const amount = finalDamage(raw)
        const result = applyDamage(amount, target)
        this.setHp(target, result.hpLeft, result.shieldLeft)
        this.log.push({
          type: 'DAMAGE',
          ref: actor.ref,
          targetRef: target.ref,
          amount: result.hpLost,
          shieldAbsorbed: result.shieldAbsorbed,
        })
        return
      }

      case 'HEAL': {
        const power = effectivePower(effect.power, skill.isEnhanced) * potency
        const amount = Math.round(
          healAmount(power, target.desgaste.maxHp) * healMultiplier(round)
        )
        const healed = Math.min(amount, target.desgaste.maxHp - target.hp)
        target.hp += healed
        if (amount > 0) target.desgaste.relieve(RELIEF.HEAL)
        this.log.push({
          type: 'HEAL',
          ref: actor.ref,
          targetRef: target.ref,
          amount: healed,
        })
        return
      }

      case 'SHIELD': {
        const power = effectivePower(effect.power, skill.isEnhanced) * potency
        const amount = Math.round(
          healAmount(power, target.desgaste.maxHp) * healMultiplier(round)
        )
        target.shield += amount
        this.log.push({
          type: 'SHIELD',
          ref: actor.ref,
          targetRef: target.ref,
          amount,
        })
        return
      }

      case 'STAT_MODIFIER': {
        const percent = effect.percent * potency
        const result = target.conditions.addModifier({
          source: skill.key,
          stat: effect.stat,
          percent,
          turnsLeft: effect.duration,
        })
        this.log.push({
          type: 'MODIFIER',
          targetRef: target.ref,
          stat: effect.stat,
          percent,
          result,
        })
        this.refreshSpeeds()
        return
      }

      case 'APPLY_STATUS': {
        const hostile = target.side !== actor.side
        if (hostile) {
          const chance = statusChance(
            effect.baseChance,
            this.stat(actor, Stat.PRECISION),
            this.stat(target, Stat.WILL)
          )
          if (!roll(this.rng, chance)) {
            this.log.push({
              type: 'STATUS',
              targetRef: target.ref,
              status: effect.status,
              result: 'RESISTED',
            })
            return
          }
        }

        if (effect.status === StatusType.LOCK) {
          const skillKey = target.cooldowns.lock()
          this.log.push({ type: 'LOCK', targetRef: target.ref, skillKey })
          return
        }

        const value =
          effect.status === StatusType.MARK
            ? STATUS_RULES.MARK.damageTakenPercent
            : effect.status === StatusType.DOT
              ? STATUS_RULES.DOT.maxHpPercentPerTurn
              : 0
        const result = target.conditions.applyStatus(
          effect.status,
          effect.duration,
          value
        )
        this.log.push({
          type: 'STATUS',
          targetRef: target.ref,
          status: effect.status,
          result,
        })
        return
      }

      case 'REPOSITION':
        this.reposition(actor, target, effect.kind, payload)
        return

      case 'TURN_SHIFT': {
        if (effect.percent < 0) {
          if (target.delayImmune) return
          target.delayImmune = true
        }
        this.queue.shift(target.ref, effect.percent)
        this.log.push({
          type: 'TURN_SHIFT',
          targetRef: target.ref,
          percent: effect.percent,
        })
        return
      }

      case 'CHANGE_FIELD':
        // campo de batalha ainda não está no snapshot (D98): sem efeito por enquanto
        this.log.push({ type: 'FIELD_IGNORED', ref: actor.ref })
        return
    }
  }

  private reposition(
    actor: EngineUnit,
    target: EngineUnit,
    kind: Extract<SkillEffect, { type: 'REPOSITION' }>['kind'],
    payload: Extract<BattleActionPayload, { type: 'SKILL' }>
  ) {
    const grid = this.grids[target.side]

    if (kind === 'DASH' || kind === 'MOVE_ALLY') {
      const mover = kind === 'DASH' ? actor : target
      const to = payload.moveTo
      if (!to) return
      const occupant = this.grids[mover.side].unitAt(to)
      const moved =
        occupant && kind === 'MOVE_ALLY'
          ? this.grids[mover.side].swap(mover.ref, occupant, {
              a: mover.conditions.canBeMoved,
              b: this.get(occupant).conditions.canBeMoved,
            })
          : this.grids[mover.side].move(
              mover.ref,
              to,
              mover.conditions.canBeMoved
            )
      this.log.push(
        moved.isRight()
          ? { type: 'MOVE', ref: mover.ref, to, forced: false }
          : { type: 'MOVE_BLOCKED', ref: mover.ref, reason: 'BLOCKED' }
      )
      return
    }

    // forçado (empurrar, puxar, trocar inimigos): a Vontade resiste (D111)
    const chance = statusChance(
      FORCED_MOVE_BASE_CHANCE,
      this.stat(actor, Stat.PRECISION),
      this.stat(target, Stat.WILL)
    )
    if (!roll(this.rng, chance)) {
      this.log.push({
        type: 'MOVE_BLOCKED',
        ref: target.ref,
        reason: 'RESISTED',
      })
      return
    }

    let outcome: 'MOVED' | 'BLOCKED' = 'BLOCKED'
    if (kind === 'SWAP') {
      const otherRef = payload.swapWith
        ? grid.unitAt(payload.swapWith)
        : undefined
      outcome = otherRef
        ? grid.forcedSwap(target.ref, otherRef, {
            ref: target.conditions.canBeMoved,
            withRef: this.get(otherRef).conditions.canBeMoved,
          })
        : 'BLOCKED'
    } else {
      outcome = grid.forcedMove(target.ref, kind, target.conditions.canBeMoved)
    }

    this.log.push(
      outcome === 'MOVED'
        ? {
            type: 'MOVE',
            ref: target.ref,
            to: grid.positionOf(target.ref),
            forced: true,
          }
        : { type: 'MOVE_BLOCKED', ref: target.ref, reason: 'BLOCKED' }
    )
  }

  // ---------------------------------------------------------------------------
  // Turno e fim
  // ---------------------------------------------------------------------------

  private endTurn(unit: EngineUnit) {
    unit.cooldowns.endTurn()
    unit.delayImmune = false
    this.current = null
    this.afterAction()
  }

  /** Depois de qualquer mudança: velocidades, eliminação e fim forçado na rodada 30. */
  private afterAction() {
    this.refreshSpeeds()

    const elimination = checkElimination(
      this.summary(BattleSide.PLAYER),
      this.summary(BattleSide.OPPONENT),
      this.rng
    )
    if (elimination) return this.finish(elimination)

    if (this.queue.currentRound > MAX_ROUNDS) {
      this.finish(
        forcedEnd(
          this.summary(BattleSide.PLAYER),
          this.summary(BattleSide.OPPONENT),
          this.rng
        )
      )
    }
  }

  private finish(outcome: BattleOutcome) {
    this.result = outcome
    this.current = null
    this.log.push({
      type: 'BATTLE_END',
      winner: outcome.winner,
      reason: outcome.reason,
      round: Math.min(this.queue.currentRound, MAX_ROUNDS),
    })
  }

  private summary(side: BattleSide): SideSummary {
    const units = [...this.units.values()].filter((u) => u.side === side)

    return {
      side,
      units: units.map((u) => ({
        hp: u.alive ? u.hp : 0,
        startingMaxHp: u.startingMaxHp,
      })),
      desgaste: units.reduce((sum, u) => sum + u.desgaste.totalFraction(), 0),
    }
  }

  // ---------------------------------------------------------------------------
  // Apoio
  // ---------------------------------------------------------------------------

  /** Stat efetivo: base com Desgaste × buffs e debuffs. */
  private stat(unit: EngineUnit, stat: Stat): number {
    return unit.conditions.effectiveStat(stat, unit.desgaste.stat(stat))
  }

  private setHp(unit: EngineUnit, hp: number, shield: number) {
    unit.hp = Math.max(0, hp)
    unit.shield = Math.max(0, shield)

    if (unit.hp === 0 && unit.alive) {
      unit.alive = false
      this.queue.remove(unit.ref)
      this.grids[unit.side].remove(unit.ref)
      this.log.push({ type: 'DEFEATED', ref: unit.ref })
    }
  }

  /** Fundamental reduz o HP máximo: o atual é cortado para o novo máximo (9.4b). */
  private clampToMaxHp(unit: EngineUnit) {
    if (unit.hp > unit.desgaste.maxHp) unit.hp = unit.desgaste.maxHp
  }

  private refreshSpeeds() {
    for (const unit of this.units.values()) {
      if (unit.alive)
        this.queue.setSpeed(unit.ref, Math.max(1, this.stat(unit, Stat.SPEED)))
    }
  }

  private shuffledGuardians(side: BattleSide): string[] {
    const refs = [...this.units.values()]
      .filter(
        (u) => u.side === side && u.snapshot.characterClass === 'GUARDIAN'
      )
      .map((u) => u.ref)

    for (let i = refs.length - 1; i > 0; i--) {
      const j = this.rng.int(0, i)
      ;[refs[i], refs[j]] = [refs[j], refs[i]]
    }

    return refs
  }

  private get(ref: string): EngineUnit {
    const unit = this.units.get(ref)
    if (!unit) throw new Error(`BattleEngine: unidade ${ref} não existe`)

    return unit
  }
}

function createUnit(snapshot: SnapshotUnit, side: BattleSide): EngineUnit {
  const base = computeStats({
    profile: snapshot.profile,
    level: snapshot.level,
    freePoints: snapshot.freePoints,
    traitEffects: snapshot.traitEffects,
  })

  return {
    ref: snapshot.ref,
    side,
    snapshot,
    base,
    startingMaxHp: base.HP,
    hp: base.HP,
    shield: 0,
    alive: true,
    desgaste: new DesgasteState({
      baseStats: base,
      lineages: snapshot.lineages,
      hasAwakenedSkill: snapshot.skills.some((s) => s.isAwakened),
      lineageCostPercent: snapshot.lineageCostPercent,
    }),
    conditions: new UnitConditions(),
    cooldowns: new SkillCooldowns(snapshot.skills),
    skipNext: false,
    delayImmune: false,
  }
}

/** Bônus de dano dos traços pelo tipo de alcance da skill (ex.: Berserker +10% corpo a corpo). */
function traitDamageMultiplier(
  unit: EngineUnit,
  range: SkillRange | null
): number {
  if (!range) return 1

  const percent = unit.snapshot.traitEffects
    .filter((e) => e.type === 'SKILL_DAMAGE_MODIFIER' && e.range === range)
    .reduce((sum, e) => sum + ('percent' in e ? e.percent : 0), 0)

  return 1 + percent / 100
}
