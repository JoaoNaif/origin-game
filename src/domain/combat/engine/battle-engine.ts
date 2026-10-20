import { Either, left, right } from '@/core/either'
import { Rng } from '@/core/rng/rng'
import { Stat } from '@/domain/characters/enums/stat'
import { computeStats } from '@/domain/characters/services/stat-calculator'
import { StatBlock } from '@/domain/characters/value-objects/stat-block'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { StatusType } from '@/domain/skills/enums/status-type'
import { SkillEffect } from '@/domain/skills/value-objects/skill-effect'
import { PassiveEffect } from '@/domain/characters/value-objects/passive'
import { GridPosition } from '@/domain/squads/value-objects/grid-position'
import { BattleSide, MAX_ROUNDS } from '../enums/battle-enums'
import { InvalidActionError } from '../errors/invalid-action-error'
import { BattleActionPayload } from '../value-objects/battle-action'
import {
  BattleSnapshot,
  SnapshotField,
  SnapshotSkill,
  SnapshotUnit,
} from '../value-objects/battle-snapshot'
import { qualifies } from '../services/field-draw'
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
  /** Turnos começados (para a passiva periódica). */
  turnsStarted: number
}

/** Contexto de um gatilho de passiva. */
interface PassiveContext {
  attacker?: EngineUnit
  target?: EngineUnit
  status?: StatusType
}

/** Gatilhos que disparam num evento (os contínuos, ALWAYS e HP_BELOW, são lidos na hora do cálculo). */
type PassiveEvent =
  | 'TURN_START'
  | 'PERIODIC'
  | 'ON_ATTACK'
  | 'ON_HIT'
  | 'ON_KILL'
  | 'ON_HEAL'
  | 'ON_DESGASTE'
  | 'ON_STATUS'
  | 'ON_FIELD_CHANGE'

/** Vez de agir devolvida por `nextTurn`. */
export interface ActorTurn {
  ref: string
  side: BattleSide
  round: number
  tick: number
}

/** O que um efeito faria num alvo, na prévia (`previewSkill`). Chances são probabilidades, não sorteios. */
export type PreviewEffect =
  | { type: 'DAMAGE'; amount: number }
  | { type: 'HEAL' | 'SHIELD'; amount: number }
  | { type: 'STAT_MODIFIER'; stat: Stat; percent: number }
  | { type: 'APPLY_STATUS'; status: StatusType; chance: number }
  | {
      type: 'REPOSITION'
      kind: Extract<SkillEffect, { type: 'REPOSITION' }>['kind']
      chance: number
    }
  | { type: 'TURN_SHIFT'; percent: number }
  | { type: 'CHANGE_FIELD' }

export interface PreviewHit {
  ref: string
  falloff: number
  /** 1 em skill sem teste de acerto (aliado, si mesmo). */
  hitChance: number
  effects: PreviewEffect[]
}

export interface SkillPreview {
  skill: SnapshotSkill
  potency: number
  /** Custo do Desgaste na linhagem da própria skill e a folga que sobra até o piso. */
  desgaste: { cost: number; slack: number }
  hits: PreviewHit[]
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
  /** O que a skill em resolução fez (para os gatilhos de passiva depois dela). */
  private action = {
    damaged: [] as EngineUnit[],
    killed: [] as EngineUnit[],
    healed: false,
  }
  /** Efeito de passiva não dispara outra passiva (evita cadeias). */
  private inPassive = false
  /** Campo sorteado no início (D28) e catálogo para as trocas por skill (D98). */
  private readonly initialField: SnapshotField | null
  private readonly fieldCatalog: readonly SnapshotField[]
  /** Campo valendo agora: o inicial ou uma troca, com o multiplicador e a última rodada dela. */
  private field: {
    current: SnapshotField | null
    multiplier: number
    untilRound: number | null
  }

  constructor(
    snapshot: BattleSnapshot,
    private readonly rng: Rng
  ) {
    for (const side of [snapshot.player, snapshot.opponent]) {
      for (const unit of side.units) {
        this.units.set(unit.ref, createUnit(unit, side.side))
      }
    }

    this.initialField = snapshot.field.initial
    this.fieldCatalog = snapshot.field.catalog
    this.field = { current: this.initialField, multiplier: 1, untilRound: null }

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

    // o campo inicial é a primeira coisa mostrada (D28)
    this.log.push({
      type: 'FIELD',
      fieldKey: this.initialField?.key ?? null,
      ref: null,
      untilRound: null,
    })
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
      canBeMoved: unit.conditions.canBeMoved,
      isExposed: unit.conditions.isExposed,
      traitKeys: unit.snapshot.traitKeys,
    }
  }

  /** Skills da build da unidade (a IA filtra o que pode saber do outro lado, `engine.md` 3.13). */
  skillsOf(ref: string): readonly SnapshotSkill[] {
    return this.get(ref).snapshot.skills
  }

  /** Campos para onde uma skill pode trocar. */
  get fields(): readonly SnapshotField[] {
    return this.fieldCatalog
  }

  /**
   * Prévia de uma skill para a IA (`engine.md` 3.13): valida e calcula o que ela faria em cada alvo, **sem mudar nada
   * e sem usar a Rng** (chances viram números, não sorteios). Não prevê o Interceptar.
   */
  previewSkill(
    actorRef: string,
    payload: Extract<BattleActionPayload, { type: 'SKILL' }>
  ): Either<InvalidActionError, SkillPreview> {
    const actor = this.get(actorRef)
    const resolved = this.resolveSkill(actor, payload)
    if (resolved.isLeft()) return left(resolved.value)

    const { skill, hits } = resolved.value
    const potency = actor.desgaste.potencyFor(skill, actor.hp)
    const round = this.current?.round ?? this.queue.currentRound
    const own = actor.desgaste.costOf(skill)[0]

    return right({
      skill,
      potency,
      desgaste: {
        cost: own.requested,
        slack: actor.desgaste.slack(own.target, actor.hp),
      },
      hits: hits
        .filter((hit) => this.get(hit.ref).alive)
        .map((hit) =>
          this.previewHit(actor, this.get(hit.ref), skill, potency, hit, round)
        ),
    })
  }

  private previewHit(
    actor: EngineUnit,
    target: EngineUnit,
    skill: SnapshotSkill,
    potency: number,
    hit: TargetHit,
    round: number
  ): PreviewHit {
    const hostile = target.side !== actor.side
    const chanceAgainstWill = (base: number) =>
      hostile
        ? statusChance(
            base,
            this.stat(actor, Stat.PRECISION),
            this.stat(target, Stat.WILL)
          )
        : 1

    const effects = skill.effects
      .filter((e) => e.appliesTo !== 'SELF')
      .map((effect): PreviewEffect => {
        switch (effect.type) {
          case 'DAMAGE':
            return {
              type: 'DAMAGE',
              amount: this.damageOf(
                actor,
                target,
                skill,
                effect.power,
                potency,
                hit.falloff,
                round
              ),
            }
          case 'HEAL':
          case 'SHIELD':
            return {
              type: effect.type,
              amount: this.restoreOf(
                target,
                skill,
                effect.power,
                potency,
                round
              ),
            }
          case 'STAT_MODIFIER':
            return {
              type: 'STAT_MODIFIER',
              stat: effect.stat,
              percent: effect.percent * potency,
            }
          case 'APPLY_STATUS':
            return {
              type: 'APPLY_STATUS',
              status: effect.status,
              chance:
                effect.status === StatusType.STUN &&
                target.conditions.isStunImmune
                  ? 0
                  : chanceAgainstWill(effect.baseChance),
            }
          case 'REPOSITION':
            return {
              type: 'REPOSITION',
              kind: effect.kind,
              chance:
                effect.kind === 'DASH' || effect.kind === 'MOVE_ALLY'
                  ? 1
                  : chanceAgainstWill(FORCED_MOVE_BASE_CHANCE),
            }
          case 'TURN_SHIFT':
            return {
              type: 'TURN_SHIFT',
              percent:
                effect.percent < 0 && target.delayImmune ? 0 : effect.percent,
            }
          case 'CHANGE_FIELD':
            return { type: 'CHANGE_FIELD' }
        }
      })

    return {
      ref: target.ref,
      falloff: hit.falloff,
      hitChance:
        skill.baseHitChance === null
          ? 1
          : hitChance(
              skill.baseHitChance,
              this.stat(actor, Stat.PRECISION),
              this.stat(target, Stat.EVASION)
            ),
      effects,
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
      this.expireField(turn.round)
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

      unit.turnsStarted += 1
      this.firePassive(unit, 'TURN_START')
      this.firePassive(unit, 'PERIODIC')

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

  /** Valida a skill e resolve os alvos (sem mudar nada). Usado pela ação e pela prévia da IA. */
  private resolveSkill(
    actor: EngineUnit,
    payload: Extract<BattleActionPayload, { type: 'SKILL' }>
  ): Either<InvalidActionError, { skill: SnapshotSkill; hits: TargetHit[] }> {
    const skill = actor.snapshot.skills.find((s) => s.key === payload.skillKey)
    if (!skill) return left(new InvalidActionError('skill fora da build'))
    if (
      skill.effects.some((e) => e.type === 'CHANGE_FIELD') &&
      !this.fieldCatalog.some((f) => f.key === payload.fieldKey)
    ) {
      return left(
        new InvalidActionError('escolha um campo do catálogo da batalha')
      )
    }
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

    return right({ skill, hits: targets.value })
  }

  private useSkill(
    actor: EngineUnit,
    payload: Extract<BattleActionPayload, { type: 'SKILL' }>
  ): Either<InvalidActionError, void> {
    const resolved = this.resolveSkill(actor, payload)
    if (resolved.isLeft()) return left(resolved.value)
    const { skill } = resolved.value

    const potency = actor.desgaste.potencyFor(skill, actor.hp)
    this.log.push({
      type: 'SKILL',
      ref: actor.ref,
      skillKey: skill.key,
      potency,
    })

    const hits = this.applyIntercept(skill, resolved.value.hits, payload.target)
    let producedEffect = false
    this.action = { damaged: [], killed: [], healed: false }

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

      const { damaged, killed, healed } = this.action
      if (damaged.length > 0) {
        this.firePassive(actor, 'ON_ATTACK', { target: damaged[0] })
      }
      if (killed.length > 0) {
        this.firePassive(actor, 'ON_KILL', { target: killed[0] })
      }
      if (healed) this.firePassive(actor, 'ON_HEAL')
      if (charge.charges.some((c) => c.applied > 0)) {
        this.firePassive(actor, 'ON_DESGASTE')
      }
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
        const amount = this.damageOf(
          actor,
          target,
          skill,
          effect.power,
          potency,
          falloff,
          round
        )
        const result = applyDamage(
          amount,
          target,
          this.passiveIgnoresShield(actor)
        )
        this.setHp(target, result.hpLeft, result.shieldLeft)
        this.log.push({
          type: 'DAMAGE',
          ref: actor.ref,
          targetRef: target.ref,
          amount: result.hpLost,
          shieldAbsorbed: result.shieldAbsorbed,
        })
        if (target.side !== actor.side) {
          this.action.damaged.push(target)
          if (!target.alive) this.action.killed.push(target)
          else this.firePassive(target, 'ON_HIT', { attacker: actor })
        }
        return
      }

      case 'HEAL': {
        const amount = this.restoreOf(
          target,
          skill,
          effect.power,
          potency,
          round
        )
        const healed = Math.min(amount, target.desgaste.maxHp - target.hp)
        target.hp += healed
        if (amount > 0) target.desgaste.relieve(RELIEF.HEAL)
        if (healed > 0) this.action.healed = true
        this.log.push({
          type: 'HEAL',
          ref: actor.ref,
          targetRef: target.ref,
          amount: healed,
        })
        return
      }

      case 'SHIELD': {
        const amount = this.restoreOf(
          target,
          skill,
          effect.power,
          potency,
          round
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
        if (result !== 'IMMUNE') {
          this.firePassive(target, 'ON_STATUS', {
            attacker: actor,
            status: effect.status,
          })
        }
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
        this.changeField(
          actor,
          payload.fieldKey!,
          effect.duration,
          effect.multiplier
        )
        return
    }
  }

  /** Dano de um efeito DAMAGE num alvo, antes do escudo (ordem do D68). */
  private damageOf(
    actor: EngineUnit,
    target: EngineUnit,
    skill: SnapshotSkill,
    effectPower: number,
    potency: number,
    falloff: number,
    round: number
  ): number {
    const power = effectivePower(effectPower, skill.isEnhanced) * potency
    const raw =
      baseDamage(
        power,
        this.stat(actor, Stat.ATTACK),
        this.stat(target, Stat.DEFENSE)
      ) *
      falloff *
      damageMultiplier(round) *
      target.conditions.damageTakenMultiplier *
      traitDamageMultiplier(actor, skill.range) *
      (1 - this.passiveDamageReduction(target) / 100)

    return finalDamage(raw)
  }

  /** Quanto uma cura ou escudo renderia no alvo. */
  private restoreOf(
    target: EngineUnit,
    skill: SnapshotSkill,
    effectPower: number,
    potency: number,
    round: number
  ): number {
    const power = effectivePower(effectPower, skill.isEnhanced) * potency

    return Math.round(
      healAmount(power, target.desgaste.maxHp) * healMultiplier(round)
    )
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
    return (
      unit.conditions.effectiveStat(stat, unit.desgaste.stat(stat)) *
      this.passiveStatMultiplier(unit, stat) *
      this.fieldMultiplier(unit, stat)
    )
  }

  // ---------------------------------------------------------------------------
  // Campo de batalha (D28, D40, D98, `engine.md` 3.12)
  // ---------------------------------------------------------------------------

  /** Campo valendo agora (o inicial ou a troca em andamento). */
  get activeField(): { key: string | null; untilRound: number | null } {
    return {
      key: this.field.current?.key ?? null,
      untilRound: this.field.untilRound,
    }
  }

  /** Bônus do campo: só para quem tem um dos traços pedidos, nos dois lados; fora do limite de fontes (D98). */
  private fieldMultiplier(unit: EngineUnit, stat: Stat): number {
    const field = this.field.current
    if (!field || !qualifies(field, unit.snapshot.traitKeys)) return 1

    const percent =
      stat === field.primaryStat
        ? field.primaryPercent
        : stat === field.secondaryStat
          ? field.secondaryPercent
          : 0

    return 1 + (percent * this.field.multiplier) / 100
  }

  /**
   * Troca o campo por skill (D98): vale até o fim da rodada atual + N rodadas, com o bônus multiplicado; uma troca
   * ativa por vez (a nova substitui a anterior). Na mesma ação, troca uma vez só.
   */
  private changeField(
    actor: EngineUnit,
    fieldKey: string,
    duration: number,
    multiplier: number
  ) {
    const round = this.current?.round ?? this.queue.currentRound
    const untilRound = round + duration
    if (
      this.field.untilRound === untilRound &&
      this.field.current?.key === fieldKey
    )
      return

    this.field = {
      current: this.fieldCatalog.find((f) => f.key === fieldKey) ?? null,
      multiplier,
      untilRound,
    }
    this.log.push({ type: 'FIELD', fieldKey, ref: actor.ref, untilRound })
    this.afterFieldChange()
  }

  /** Volta ao campo inicial quando a troca acaba. */
  private expireField(round: number) {
    if (this.field.untilRound === null || round <= this.field.untilRound) return

    this.field = { current: this.initialField, multiplier: 1, untilRound: null }
    this.log.push({
      type: 'FIELD',
      fieldKey: this.initialField?.key ?? null,
      ref: null,
      untilRound: null,
    })
    this.afterFieldChange()
  }

  private afterFieldChange() {
    this.refreshSpeeds()
    for (const unit of this.units.values()) {
      this.firePassive(unit, 'ON_FIELD_CHANGE')
    }
  }

  // ---------------------------------------------------------------------------
  // Passivas (D78, D83, `engine.md` 3.11)
  // ---------------------------------------------------------------------------

  /** Passiva contínua ativa agora: ALWAYS sempre; HP_BELOW com o HP abaixo do limite. */
  private passiveActive(unit: EngineUnit): boolean {
    const trigger = unit.snapshot.passive.trigger
    if (trigger.type === 'ALWAYS') return true
    if (trigger.type === 'HP_BELOW') {
      return (unit.hp / unit.desgaste.maxHp) * 100 < trigger.percent
    }

    return false
  }

  private passiveEffects(unit: EngineUnit): readonly PassiveEffect[] {
    return this.passiveActive(unit) ? unit.snapshot.passive.effects : []
  }

  /** Ignora escudos (ex.: Ecko). */
  private passiveIgnoresShield(unit: EngineUnit): boolean {
    return this.passiveEffects(unit).some((e) => e.type === 'IGNORE_SHIELD')
  }

  /** % de dano recebido a menos. */
  private passiveDamageReduction(unit: EngineUnit): number {
    return this.passiveEffects(unit).reduce(
      (sum, e) => sum + (e.type === 'REDUCE_DAMAGE' ? e.percent : 0),
      0
    )
  }

  /**
   * Stat da passiva **condicional** (HP_BELOW). Aumento permanente não existe (D83), então ALWAYS não mexe em stat.
   */
  private passiveStatMultiplier(unit: EngineUnit, stat: Stat): number {
    if (unit.snapshot.passive.trigger.type !== 'HP_BELOW') return 1

    return this.passiveEffects(unit).reduce(
      (total, e) =>
        e.type === 'STAT_MODIFIER' && e.stat === stat
          ? total * (1 + e.percent / 100)
          : total,
      1
    )
  }

  /** Dispara a passiva da unidade se o gatilho bate com o evento. */
  private firePassive(
    unit: EngineUnit,
    event: PassiveEvent,
    context: PassiveContext = {}
  ) {
    if (this.inPassive || !unit.alive) return

    const passive = unit.snapshot.passive
    const trigger = passive.trigger
    if (trigger.type !== event) return
    if (
      trigger.type === 'PERIODIC' &&
      unit.turnsStarted % trigger.everyTurns !== 0
    ) {
      return
    }
    if (trigger.type === 'ON_STATUS' && trigger.status !== context.status) {
      return
    }

    this.inPassive = true
    this.log.push({
      type: 'PASSIVE',
      ref: unit.ref,
      name: passive.name,
      trigger: trigger.type,
    })
    for (const effect of passive.effects) {
      this.applyPassiveEffect(unit, effect, context)
    }
    this.inPassive = false
  }

  private applyPassiveEffect(
    owner: EngineUnit,
    effect: PassiveEffect,
    context: PassiveContext
  ) {
    switch (effect.type) {
      case 'REDUCE_COOLDOWN':
        owner.cooldowns.reduce(effect.amount)
        return

      case 'HEAL': {
        const round = this.current?.round ?? this.queue.currentRound
        const amount = Math.round(
          ((owner.desgaste.maxHp * effect.percentOfMaxHp) / 100) *
            healMultiplier(round)
        )
        const healed = Math.min(amount, owner.desgaste.maxHp - owner.hp)
        owner.hp += healed
        this.log.push({
          type: 'HEAL',
          ref: owner.ref,
          targetRef: owner.ref,
          amount: healed,
        })
        return
      }

      case 'ADVANCE_TURN':
        this.queue.shift(owner.ref, effect.percent)
        this.log.push({
          type: 'TURN_SHIFT',
          targetRef: owner.ref,
          percent: effect.percent,
        })
        return

      case 'STAT_MODIFIER':
        // num evento: vale até o fim do próximo turno do dono
        owner.conditions.addModifier({
          source: `PASSIVE:${owner.ref}`,
          stat: effect.stat,
          percent: effect.percent,
          turnsLeft: 2,
        })
        this.refreshSpeeds()
        return

      case 'APPLY_STATUS': {
        const target =
          effect.target === 'SELF'
            ? owner
            : effect.target === 'ATTACKER'
              ? context.attacker
              : context.target
        if (!target?.alive) return

        const chance =
          target.side === owner.side
            ? effect.chance
            : statusChance(
                effect.chance,
                this.stat(owner, Stat.PRECISION),
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

        if (effect.status === StatusType.LOCK) {
          this.log.push({
            type: 'LOCK',
            targetRef: target.ref,
            skillKey: target.cooldowns.lock(),
          })
          return
        }

        const result = target.conditions.applyDefaultStatus(effect.status)
        this.log.push({
          type: 'STATUS',
          targetRef: target.ref,
          status: effect.status,
          result,
        })
        return
      }

      case 'IGNORE_SHIELD':
      case 'REDUCE_DAMAGE':
        // contínuos: lidos na hora do dano (passiveIgnoresShield, passiveDamageReduction)
        return
    }
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
    turnsStarted: 0,
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
