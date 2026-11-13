import { Either, left, right } from '@/core/either'
import { Rng } from '@/core/rng/rng'
import { SwitchableRng } from '@/core/rng/switchable-rng'
import { CharacterClass } from '@/domain/characters/enums/character-class'
import { Stat } from '@/domain/characters/enums/stat'
import { computeStats } from '@/domain/characters/services/stat-calculator'
import { StatBlock } from '@/domain/characters/value-objects/stat-block'
import { SkillArea } from '@/domain/skills/enums/skill-area'
import { SkillRange } from '@/domain/skills/enums/skill-range'
import { SkillTarget } from '@/domain/skills/enums/skill-target'
import { SkillTier } from '@/domain/skills/enums/skill-tier'
import { StatusType } from '@/domain/skills/enums/status-type'
import { PassiveEffect } from '@/domain/characters/value-objects/passive'
import { GridPosition } from '@/domain/squads/value-objects/grid-position'
import { BattleSide, MAX_ROUNDS } from '../enums/battle-enums'
import { InvalidActionError } from '../errors/invalid-action-error'
import { BattleActionPayload } from '../value-objects/battle-action'
import {
  BattleSnapshot,
  SnapshotEffect,
  SnapshotField,
  SnapshotGear,
  SnapshotSkill,
  SnapshotUnit,
} from '../value-objects/battle-snapshot'
import { GearPassive } from '@/domain/gear/value-objects/gear-passive'
import { BEAST_FIELD_CAP } from '@/domain/beasts/beast-values'
import { qualifies } from '../services/field-draw'
import {
  BattleOutcome,
  checkElimination,
  damageMultiplier,
  EXHAUSTION_AFTER_ROUND,
  forcedEnd,
  healMultiplier,
  SideSummary,
} from '../services/battle-end'
import {
  BattleGrid,
  FORCED_MOVE_BASE_CHANCE,
  isAdjacent,
} from '../services/battle-grid'
import {
  CONTROLLER_WILL_FACTOR,
  STATUS_RULES,
  StatusApplication,
  UnitConditions,
  WOUND_HEAL_MULTIPLIER,
} from '../services/conditions'
import { SkillCooldowns } from '../services/cooldowns'
import {
  applyDamage,
  baseDamage,
  damageScale,
  effectivePower,
  finalDamage,
  healAmount,
  healShare,
} from '../services/damage'
import { defend } from '../services/defend'
import { DESGASTE_FLOOR, DesgasteState, RELIEF } from '../services/desgaste'
import { hitChance, roll, statusChance } from '../services/hit'
import { InterceptState } from '../services/intercept'
import {
  COVER_DAMAGE_MULTIPLIER,
  exposedOfRow,
  resolveTargets,
  TargetHit,
} from '../services/targeting'
import {
  ACTION_BAR_MAX,
  MOVE_TURN_COST_PERCENT,
  statAverage,
  Turn,
  TurnQueue,
} from '../services/turn-queue'
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
  /** Já foi atrasado: imune a novo atraso até agir (D102). */
  delayImmune: boolean
  /** Já foi trocado por um aliado: não pode ser trocado de novo até agir, senão nunca chega a vez dele (D141). */
  swapImmune: boolean
  /** Turnos começados (para a passiva periódica). */
  turnsStarted: number
  /** Quem provocou (D124), enquanto a unidade está Provocada. */
  tauntedBy: string | null
  /** Quem protege a unidade até o próximo turno dele (D124). */
  protectedBy: string | null
  /** Parceiro do Ligado (D146). */
  linkedWith: string | null
  /** Indestrutível (DOM, D93): não leva dano até o próximo turno dele (o dano contínuo desse turno incluso). */
  invulnerable: boolean
  /** Classe para as marcas e auras (D128); nulo na besta, que não tem classe (D154). */
  unitClass: CharacterClass | null
  /** Besta em campo: turnos dela que ainda faltam (D95). */
  beastTurnsLeft: number
  /** Igualdade no dono (D95, D154): o buffer e os turnos dele que faltam; nulo = sem Igualdade. */
  equality: EqualityState | null
}

/** Igualdade ativa no dono. */
interface EqualityState {
  source: string
  buffer: number
  turnsLeft: number
  bonusPercent: number
  absorbShare: number
  breakPercent: number
  /** Começou neste turno do dono: o turno da invocação não conta. */
  fresh: boolean
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
  | 'ON_ALLY_DEFEATED'
  | 'ON_DEFEATED'

/** Vez de agir devolvida por `nextTurn`. */
export interface ActorTurn {
  ref: string
  side: BattleSide
  /** A IA joga esta vez (besta da Dominância, D154), mesmo do lado do jogador. */
  auto?: boolean
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
      kind: Extract<SnapshotEffect, { type: 'REPOSITION' }>['kind']
      chance: number
    }
  | { type: 'TURN_SHIFT'; percent: number }
  | { type: 'CHANGE_FIELD' }
  /** Fração do Desgaste que a recuperação aliviaria. */
  | { type: 'RECOVER'; relieved: number }
  | { type: 'PROTECT' }
  | { type: 'GRANT_TURN' }
  /** O dano já vem multiplicado na prévia. */
  | { type: 'EXPLOIT' }
  | { type: 'CLEANSE'; status: StatusType | null }
  /** Rei (DOM, D93): −% em todos os stats, com a chance de pegar. */
  | { type: 'WEAKEN'; percent: number; chance: number }
  /** Indestrutível (DOM, D93): anula o dano até o próximo turno. */
  | { type: 'INVULNERABLE' }
  /** Invocação (D154): a besta entra em campo. */
  | { type: 'SUMMON'; beastRef: string }
  /** Igualdade (D154): o buffer que o dono guardaria. */
  | { type: 'EQUALITY'; buffer: number }

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

/**
 * Formação (D128): aura de cada classe nos aliados **adjacentes** (4 direções). Duas auras iguais não somam. A
 * Vanguarda impede empurrar/puxar/trocar os adjacentes; o Suporte aumenta a cura recebida; a Artilharia (no fundo da
 * linha) e o Executor (sem ninguém ao lado) ganham para si.
 */
export const FORMATION_STAT_AURA: Partial<
  Record<CharacterClass, { stat: Stat; percent: number }>
> = {
  GUARDIAN: { stat: Stat.DEFENSE, percent: 10 },
  TACTICIAN: { stat: Stat.SPEED, percent: 5 },
  CONTROLLER: { stat: Stat.WILL, percent: 10 },
  MARKSMAN: { stat: Stat.PRECISION, percent: 10 },
}
export const SUPPORT_HEAL_AURA_PERCENT = 15
export const ARTILLERY_BACK_DAMAGE_PERCENT = 10
export const EXECUTOR_LONE_ATTACK_PERCENT = 10

/** Engajado (D129): quem tem na frente da linha oposta um destes não sai barato da frente. */
export const ENGAGING_CLASSES: readonly CharacterClass[] = [
  CharacterClass.VANGUARD,
  CharacterClass.GUARDIAN,
  CharacterClass.EXECUTOR,
]

/** Proteger (D127): Defesa do protetor enquanto protege e Poder do contra-ataque em quem bate no protegido. */
export const PROTECT_DEFENSE_PERCENT = 50
export const PROTECT_COUNTER_POWER = 0.4

/** Marca de Coordenação do Tático (D126). */
/** Marcas de classe (D125, D126): objeto para a calibração conseguir testar valores (`scripts/sim-setup.ts`). */
export const CLASS_MARKS = {
  /** Coordenação do Tático: Ataque do aliado até agir (D126). */
  coordinationAttackPercent: 10,
  /** Controlador: fator da Vontade do alvo nos status dele (D125). */
  controllerWillFactor: CONTROLLER_WILL_FACTOR,
}

/** Quantas vezes a linha do tempo mostra (D126). */
export const TIMELINE_LENGTH = 8

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
  private readonly intercepts: Record<BattleSide, InterceptState>
  /** Ordem dos Guardiões de cada lado, fixa pela seed no início (D102). */
  private readonly guardianOrder: Record<BattleSide, string[]>
  private readonly queue: TurnQueue
  private current: Turn | null = null
  private result: BattleOutcome | null = null
  private log: BattleEvent[] = []
  /** Dano causado por lado nos inimigos (HP + escudo), para o resumo do fim da batalha. */
  private readonly damageDealt: Record<BattleSide, number> = {
    PLAYER: 0,
    OPPONENT: 0,
  }
  /** O que a skill em resolução fez (para os gatilhos de passiva depois dela). */
  private action = {
    damaged: [] as EngineUnit[],
    killed: [] as EngineUnit[],
    healed: false,
  }
  /** Ações cedidas pelo Comando, na ordem (D126): agem antes da fila voltar a andar. */
  private granted: string[] = []
  /** Vizinhos de cada unidade, por versão da grade (auras de formação, D128). */
  private readonly neighbourCache: Record<
    BattleSide,
    { version: number; byRef: Map<string, EngineUnit[]> }
  > = {
    PLAYER: { version: -1, byRef: new Map() },
    OPPONENT: { version: -1, byRef: new Map() },
  }
  /** Protetor que segurou o golpe da skill em resolução (contra-ataque depois dela, D127). */
  private redirectedTo: string | null = null
  /** A vez atual é uma ação cedida (não conta recarga). */
  private currentIsExtra = false
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

  /**
   * Escala do dano e rendimento da cura e do escudo no nível da batalha (a média das 8 unidades, D137): a mesma para
   * os dois lados.
   */
  readonly damageScale: number
  private readonly healShare: number
  /** Regras trocadas pelo evento (pesquisa, D155): Exaustão mais cedo, sem cura, Velocidade igual. */
  private readonly exhaustionAfter: number
  private readonly noHealing: boolean
  /** Velocidade de todas as unidades com `equalSpeed` (a média do início); nulo = a de cada uma. */
  private equalSpeed: number | null = null

  /** Foto, sorte do início e ações já jogadas: bastam para reconstruir a batalha (`fork`). */
  private readonly initialRng: Rng
  private history: BattleActionPayload[] = []

  /** `source`: cópia direta de outra batalha no ponto atual (`fork`), com `rng` como a sorte dali em diante. */
  constructor(
    private readonly snapshot: BattleSnapshot,
    private readonly rng: Rng,
    source?: BattleEngine
  ) {
    const all = [...snapshot.player.units, ...snapshot.opponent.units]
    const level = all.reduce((sum, u) => sum + u.level, 0) / all.length
    this.damageScale = damageScale(level)
    this.healShare = healShare(level)
    this.exhaustionAfter =
      snapshot.rules?.exhaustionAfterRound ?? EXHAUSTION_AFTER_ROUND
    this.noHealing = snapshot.rules?.noHealing ?? false

    if (source) {
      for (const [ref, u] of source.units) {
        this.units.set(ref, {
          ...u,
          desgaste: u.desgaste.clone(),
          conditions: u.conditions.clone(),
          cooldowns: u.cooldowns.clone(),
          equality: u.equality ? { ...u.equality } : null,
        })
      }
      this.grids = {
        PLAYER: source.grids.PLAYER.clone(),
        OPPONENT: source.grids.OPPONENT.clone(),
      }
      this.intercepts = {
        PLAYER: source.intercepts.PLAYER.clone(),
        OPPONENT: source.intercepts.OPPONENT.clone(),
      }
      this.guardianOrder = source.guardianOrder
      this.queue = source.queue.clone(rng)
      this.current = source.current ? { ...source.current } : null
      this.result = source.result
      this.log = [...source.log]
      this.damageDealt = { ...source.damageDealt }
      this.granted = [...source.granted]
      this.currentIsExtra = source.currentIsExtra
      this.initialField = source.initialField
      this.fieldCatalog = source.fieldCatalog
      this.field = { ...source.field }
      this.initialRng = source.initialRng
      this.history = [...source.history]
      this.equalSpeed = source.equalSpeed
      return
    }

    this.initialRng = rng.clone()
    for (const side of [snapshot.player, snapshot.opponent]) {
      for (const unit of side.units) {
        this.units.set(unit.ref, createUnit(unit, side.side))
      }
      // bestas (D154): fora de campo até a invocação (fora da grade e da fila)
      for (const beast of side.beasts ?? []) {
        this.units.set(beast.ref, {
          ...createUnit(beast, side.side),
          alive: false,
        })
      }
    }

    this.intercepts = {
      PLAYER: new InterceptState(),
      OPPONENT: new InterceptState(),
    }
    this.initialField = snapshot.field.initial
    this.fieldCatalog = snapshot.field.catalog
    this.field = { current: this.initialField, multiplier: 1, untilRound: null }

    this.grids = {
      PLAYER: new BattleGrid(snapshot.player.units),
      OPPONENT: new BattleGrid(snapshot.opponent.units),
    }

    const starting = [...this.units.values()].filter((u) => u.alive)
    if (snapshot.rules?.equalSpeed) {
      this.equalSpeed = Math.max(
        1,
        starting.reduce((sum, u) => sum + this.stat(u, Stat.SPEED), 0) /
          starting.length
      )
    }

    this.queue = new TurnQueue(
      starting.map((u) => ({
        ref: u.ref,
        speed: this.equalSpeed ?? this.stat(u, Stat.SPEED),
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

  /** De quem é a vez agora (depois de `nextTurn`), ou nulo. */
  get currentRef(): string | null {
    return this.current?.ref ?? null
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
    // stats, recargas e engajamento só são calculados se alguém ler (a IA lê `unit` milhares de vezes por decisão,
    // quase sempre só o lado, a vida ou a posição)
    let stats: StatBlock | null = null
    const computeStats = () =>
      Object.fromEntries(
        Object.values(Stat).map((s) => [s, this.stat(unit, s)])
      ) as StatBlock
    const engaged = () => this.isEngaged(unit)

    return {
      ref: unit.ref,
      side: unit.side,
      hp: unit.hp,
      maxHp: unit.desgaste.maxHp,
      shield: unit.shield,
      alive: unit.alive,
      position: unit.alive ? this.grids[unit.side].positionOf(ref) : null,
      get stats(): StatBlock {
        stats ??= computeStats()
        return stats
      },
      get readySkills(): string[] {
        return unit.cooldowns.ready().map((s) => s.key)
      },
      canBeMoved: unit.conditions.canBeMoved,
      swapImmune: unit.swapImmune,
      isHidden: unit.conditions.has(StatusType.STEALTH),
      linkedWith: unit.linkedWith,
      isExposed: unit.conditions.isExposed,
      traitKeys: unit.snapshot.traitKeys,
      tauntedBy: unit.conditions.has(StatusType.TAUNT) ? unit.tauntedBy : null,
      protectedBy: unit.protectedBy,
      invulnerable: unit.invulnerable,
      /** Besta (D154): de quem é, o contrato e os turnos que faltam em campo. */
      beast: unit.snapshot.beast
        ? {
            ownerRef: unit.snapshot.beast.ownerRef,
            contract: unit.snapshot.beast.contract,
            turnsLeft: unit.alive ? unit.beastTurnsLeft : 0,
          }
        : null,
      /** Igualdade no dono: o buffer que resta e os turnos dele. */
      equality: unit.equality
        ? { buffer: unit.equality.buffer, turnsLeft: unit.equality.turnsLeft }
        : null,
      get statuses(): StatusType[] {
        return unit.conditions.active()
      },
      get engaged(): boolean {
        return engaged()
      },
      skillCount: unit.snapshot.skills.length,
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
   * e sem usar a Rng** (chances viram números, não sorteios). Já mostra o golpe desviado pelo Interceptar.
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
      // o Interceptar é previsível (Guardião adjacente, uma vez por rodada): a prévia já mostra o golpe desviado
      hits: this.applyIntercept(skill, hits, payload.target, true)
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
    const statusChanceOf = (base: number) =>
      hostile ? this.statusLandChance(actor, target, base) : 1

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
                round,
                effect.type
              ),
            }
          case 'STAT_MODIFIER':
            return {
              type: 'STAT_MODIFIER',
              stat: effect.stat,
              percent:
                effectivePower(effect.percent, skill.isEnhanced) * potency,
            }
          case 'APPLY_STATUS':
            return {
              type: 'APPLY_STATUS',
              status: effect.status,
              chance: this.canReceive(target, effect.status)
                ? statusChanceOf(effect.baseChance)
                : 0,
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
              percent: this.effectiveShift(target, effect.percent),
            }
          case 'CHANGE_FIELD':
            return { type: 'CHANGE_FIELD' }
          case 'PROTECT':
            return { type: 'PROTECT' }
          case 'GRANT_TURN':
            return { type: 'GRANT_TURN' }
          case 'EXPLOIT':
            return { type: 'EXPLOIT' }
          case 'RECOVER':
            return {
              type: 'RECOVER',
              relieved: target.desgaste.totalFraction() * RELIEF.RECOVERY_SKILL,
            }
          case 'CLEANSE':
            return { type: 'CLEANSE', status: target.conditions.worstNegative }
          case 'WEAKEN':
            return {
              type: 'WEAKEN',
              percent: effect.percent,
              chance: statusChanceOf(effect.baseChance),
            }
          case 'FORESIGHT':
            return {
              type: 'APPLY_STATUS',
              status: StatusType.STUN,
              chance: this.canReceive(target, StatusType.STUN)
                ? effect.chanceByMind[
                    target.snapshot.dom?.pillars.MIND ?? 'NONE'
                  ]
                : 0,
            }
          case 'INVULNERABLE':
            return { type: 'INVULNERABLE' }
          case 'EQUALITY':
            return {
              type: 'EQUALITY',
              buffer: Math.round(
                (target.desgaste.maxHp * effect.bufferPercent) / 100
              ),
            }
          case 'SUMMON':
            return { type: 'SUMMON', beastRef: effect.beastRef }
        }
      })

    return {
      ref: target.ref,
      falloff: hit.falloff,
      hitChance:
        skill.baseHitChance === null
          ? 1
          : this.landChance(actor, target, skill.baseHitChance),
      effects,
    }
  }

  /** Barra de ação da unidade (0 a 1000): a linha do tempo que o jogador vê (D126). */
  gauge(ref: string): number {
    return this.queue.gaugeOf(ref)
  }

  /**
   * Cópia da batalha no ponto atual, para a IA testar jogadas (`engine.md` 3.13). Reconstrói pela foto, pela sorte do
   * início e pelas ações jogadas (o motor é determinístico) e depois passa a usar `futureRng`: quem simula o futuro não
   * vê os sorteios reais. A batalha original não muda.
   */
  fork(futureRng: Rng): BattleEngine {
    return new BattleEngine(this.snapshot, futureRng, this)
  }

  /**
   * A mesma cópia, mas reconstruída pela foto, pela sorte do início e pelas ações jogadas. Mais lenta; serve de
   * referência para conferir a cópia direta (testes).
   */
  forkByReplay(futureRng: Rng): BattleEngine {
    const rng = new SwitchableRng(this.initialRng.clone())
    const copy = new BattleEngine(this.snapshot, rng)

    for (const payload of this.history) {
      copy.nextTurn()
      copy.act(payload)
    }
    if (this.current) copy.nextTurn()
    rng.inner = futureRng

    return copy
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
          ...(unit.snapshot.beast?.auto ? { auto: true } : {}),
        }
      }

      // Comando (D126): a ação cedida vem antes da fila andar; não é turno novo (sem início de turno)
      const grantedRef = this.granted.shift()
      if (grantedRef) {
        const ally = this.get(grantedRef)
        if (!ally.alive || ally.conditions.cannotAct) continue
        ally.conditions.remove(StatusType.STEALTH)
        this.current = {
          ref: ally.ref,
          round: this.queue.currentRound,
          tick: this.queue.currentTick,
        }
        this.currentIsExtra = true
        this.log.push({
          type: 'TURN',
          ref: ally.ref,
          round: this.current.round,
          tick: this.current.tick,
          extra: true,
        })
        this.refreshSpeeds()
        continue
      }

      const turn = this.queue.next()
      this.currentIsExtra = false
      this.expireField(turn.round)
      const unit = this.get(turn.ref)
      for (const other of this.units.values()) {
        if (other.protectedBy === unit.ref) other.protectedBy = null
      }
      const turnEvent: Extract<BattleEvent, { type: 'TURN' }> = {
        type: 'TURN',
        ref: unit.ref,
        round: turn.round,
        tick: turn.tick,
      }
      this.log.push(turnEvent)

      const start = unit.conditions.startTurn(unit.desgaste.maxHp)
      const statuses = unit.conditions.active()
      if (statuses.length > 0) turnEvent.statuses = statuses
      if (start.dotDamage > 0) {
        // Indestrutível (D152): o dano contínuo do início do próximo turno também é anulado
        const amount = unit.invulnerable ? 0 : start.dotDamage
        const damage = applyDamage(amount, unit)
        this.setHp(unit, damage.hpLeft, damage.shieldLeft)
        this.damageDealt[other(unit.side)] +=
          damage.hpLost + damage.shieldAbsorbed
        this.log.push({ type: 'DOT', ref: unit.ref, amount })
      }
      unit.invulnerable = false
      this.syncLink(unit)

      if (!unit.alive) {
        this.afterAction()
        continue
      }
      if (start.spreads) this.spreadContagion(unit)

      unit.turnsStarted += 1
      this.gearRegen(unit)
      this.firePassive(unit, 'TURN_START')
      this.firePassive(unit, 'PERIODIC')

      const skipReason = start.skipAction
        ? start.skipReason!
        : this.gearTakesAction(unit)
          ? 'GEAR'
          : null
      if (skipReason) {
        this.log.push({ type: 'SKIP', ref: unit.ref, reason: skipReason })
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
    this.history.push(payload)

    // mover e trocar custam meio turno e não contam para as recargas (senão andar aceleraria as skills)
    // Proteger custa meio turno, como mover (D127)
    const protecting =
      payload.type === 'SKILL' &&
      actor.snapshot.skills
        .find((s) => s.key === payload.skillKey)!
        .effects.some((e) => e.type === 'PROTECT')
    if (protecting) this.halfTurnBack(actor)
    const moved =
      payload.type === 'MOVE' || payload.type === 'SWAP' || protecting
    // ação cedida pelo Comando também não conta recarga (não é um turno do aliado)
    this.endTurn(actor, { tickCooldowns: !moved && !this.currentIsExtra })
    this.currentIsExtra = false

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
        if (!payload.timeout && this.hasPossibleSkill(actor)) {
          return left(
            new InvalidActionError(
              'só Defende sem skill possível ou com o tempo esgotado (D38)'
            )
          )
        }
        defend(actor.conditions, actor.desgaste)
        this.log.push({ type: 'DEFEND', ref: actor.ref })
        return right(undefined)

      case 'MOVE': {
        const engaged = this.isEngaged(actor)
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
        if (!engaged) this.halfTurnBack(actor)
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
        if (
          !isAdjacent(
            this.grids[actor.side].positionOf(actor.ref),
            this.grids[actor.side].positionOf(ally.ref)
          )
        ) {
          return left(
            new InvalidActionError('troca só com aliado adjacente (D120)')
          )
        }
        if (ally.swapImmune) {
          return left(
            new InvalidActionError(
              'esse aliado já foi trocado e ainda não agiu (D141)'
            )
          )
        }
        const actorEngaged = this.isEngaged(actor)
        const allyEngaged = this.isEngaged(ally)
        const swapped = this.grids[actor.side].swap(actor.ref, ally.ref, {
          a: actor.conditions.canBeMoved,
          b: ally.conditions.canBeMoved,
        })
        if (swapped.isLeft())
          return left(new InvalidActionError(swapped.value.message))
        this.log.push({
          type: 'MOVE',
          ref: actor.ref,
          to: this.grids[actor.side].positionOf(actor.ref),
          forced: false,
        })
        // meio turno para os dois (D123); quem está Engajado paga o turno inteiro (D129)
        if (!actorEngaged) this.halfTurnBack(actor)
        const allyCost = allyEngaged ? 100 : MOVE_TURN_COST_PERCENT
        this.queue.shift(ally.ref, -allyCost)
        ally.swapImmune = true
        this.log.push({
          type: 'TURN_SHIFT',
          targetRef: ally.ref,
          percent: -allyCost,
        })
        return right(undefined)
      }

      case 'SKILL':
        return this.useSkill(actor, payload)
    }
  }

  /**
   * Provocado (D124): golpe de alvo único em inimigo tem que mirar em quem provocou, se ele puder ser alvo dessa skill.
   * Área, apoio e movimento ficam livres.
   */
  private tauntError(
    actor: EngineUnit,
    skill: SnapshotSkill,
    targetSide: BattleSide,
    hits: readonly TargetHit[]
  ): InvalidActionError | null {
    if (
      !actor.conditions.has(StatusType.TAUNT) ||
      !actor.tauntedBy ||
      skill.target !== SkillTarget.ENEMY ||
      skill.area !== SkillArea.SINGLE
    ) {
      return null
    }
    const taunter = this.get(actor.tauntedBy)
    if (!taunter.alive || taunter.side !== targetSide) return null
    if (hits.some((h) => h.ref === taunter.ref)) return null

    const grid = this.grids[targetSide]
    const reach = resolveTargets({
      skill,
      actor: {
        ref: actor.ref,
        ...this.grids[actor.side].positionOf(actor.ref),
      },
      units: grid.units(),
      cell: grid.positionOf(taunter.ref),
      ...this.targetingFlags(targetSide),
    })
    const canReach =
      reach.isRight() && reach.value.some((h) => h.ref === taunter.ref)

    return canReach
      ? new InvalidActionError(
          `Provocado: o golpe tem que ir em ${taunter.snapshot.name} (D124)`
        )
      : null
  }

  /** Contra-ataque (D127): quem segurou um golpe protegendo devolve um golpe em quem bateu (sem acerto nem Desgaste). */
  private counterAttack(attacker: EngineUnit) {
    const protector = this.redirectedTo ? this.get(this.redirectedTo) : null
    this.redirectedTo = null
    if (!protector?.alive || !attacker.alive) return

    const round = this.current?.round ?? this.queue.currentRound
    const amount = attacker.invulnerable
      ? 0
      : finalDamage(
          baseDamage(
            PROTECT_COUNTER_POWER,
            this.stat(protector, Stat.ATTACK),
            this.stat(attacker, Stat.DEFENSE),
            this.damageScale
          ) *
            damageMultiplier(round, this.exhaustionAfter) *
            attacker.conditions.damageTakenMultiplier *
            (1 - this.damageReduction(attacker, true) / 100)
        )
    const result = applyDamage(
      this.absorbByEquality(attacker, amount),
      attacker
    )
    this.setHp(attacker, result.hpLeft, result.shieldLeft)
    this.checkEqualityBreak(attacker)
    this.damageDealt[protector.side] += result.hpLost + result.shieldAbsorbed
    this.log.push({
      type: 'DAMAGE',
      ref: protector.ref,
      targetRef: attacker.ref,
      amount: result.hpLost,
      shieldAbsorbed: result.shieldAbsorbed,
      hpLeft: result.hpLeft,
    })
  }

  /** Quem está Exposto ou Furtivo em cada lado, para escolher os alvos. */
  private targetingFlags(side: BattleSide) {
    const refs = this.grids[side].units().map((u) => u.ref)
    const withFlag = (test: (conditions: UnitConditions) => boolean) =>
      new Set(refs.filter((ref) => test(this.get(ref).conditions)))

    return {
      exposedRefs: withFlag((c) => c.isExposed),
      hiddenRefs: withFlag((c) => c.has(StatusType.STEALTH)),
    }
  }

  /** O status tem efeito nessa unidade agora: imunidade do Atordoado e Adormecido, e parceiro para o Ligado. */
  private canReceive(target: EngineUnit, status: StatusType): boolean {
    if (status === StatusType.STUN || status === StatusType.SLEEP) {
      return !target.conditions.isStunImmune
    }
    if (status === StatusType.LINK) return this.linkCandidate(target) !== null

    return true
  }

  /** Parceiro do Ligado: o aliado adjacente com menos vida; empate pela `ref` (sem usar a seed). */
  private linkCandidate(target: EngineUnit): EngineUnit | null {
    if (!target.alive) return null
    const grid = this.grids[target.side]
    const position = grid.positionOf(target.ref)
    const [partner] = [...this.units.values()]
      .filter(
        (u) =>
          u.side === target.side &&
          u.alive &&
          u.ref !== target.ref &&
          isAdjacent(position, grid.positionOf(u.ref))
      )
      .sort((a, b) => a.hp - b.hp || a.ref.localeCompare(b.ref))

    return partner ?? null
  }

  /**
   * Liga o alvo ao parceiro (D146); um novo elo desfaz os anteriores dos dois. `sourceRef` (quem ligou) vai só no
   * evento do alvo: o elo conta uma vez no XP (D147).
   */
  private applyLink(
    target: EngineUnit,
    duration: number,
    sourceRef: string
  ): StatusApplication {
    const partner = this.linkCandidate(target)
    if (!partner) return 'IMMUNE'

    const renewed = target.linkedWith === partner.ref
    this.clearLink(target)
    this.clearLink(partner)
    for (const [unit, mate] of [
      [target, partner],
      [partner, target],
    ]) {
      unit.conditions.applyStatus(StatusType.LINK, duration)
      unit.linkedWith = mate.ref
      this.log.push({
        type: 'STATUS',
        ...(unit === target ? { ref: sourceRef } : {}),
        targetRef: unit.ref,
        status: StatusType.LINK,
        result: renewed ? 'RENEWED' : 'APPLIED',
      })
    }

    return renewed ? 'RENEWED' : 'APPLIED'
  }

  /** Parceiro com o elo valendo: os dois vivos e com o status. */
  private linkedPartner(unit: EngineUnit): EngineUnit | null {
    if (!unit.linkedWith || !unit.conditions.has(StatusType.LINK)) return null
    const partner = this.get(unit.linkedWith)

    return partner.alive && partner.conditions.has(StatusType.LINK)
      ? partner
      : null
  }

  /** Desfaz o elo nos dois lados. */
  private clearLink(unit: EngineUnit) {
    const partner = unit.linkedWith ? this.get(unit.linkedWith) : null
    unit.conditions.remove(StatusType.LINK)
    unit.linkedWith = null
    if (partner) {
      partner.conditions.remove(StatusType.LINK)
      partner.linkedWith = null
    }
  }

  /** O elo só vale com os dois: se um perdeu o status (duração, consumo, morte), acaba para o outro. */
  private syncLink(unit: EngineUnit) {
    if (unit.linkedWith && !this.linkedPartner(unit)) this.clearLink(unit)
  }

  /** O parceiro leva parte do dano direto, sem Defesa e sem repassar de volta (D146). */
  private shareLinkedDamage(
    actor: EngineUnit,
    partner: EngineUnit,
    dealt: number
  ) {
    if (!partner.alive || dealt <= 0 || partner.invulnerable) return

    const amount = Math.round(
      (dealt * STATUS_RULES.LINK.sharedDamagePercent) / 100
    )
    if (amount <= 0) return

    const result = applyDamage(amount, partner)
    this.setHp(partner, result.hpLeft, result.shieldLeft)
    this.log.push({
      type: 'DAMAGE',
      ref: actor.ref,
      targetRef: partner.ref,
      amount: result.hpLost,
      shieldAbsorbed: result.shieldAbsorbed,
      hpLeft: result.hpLeft,
      linked: true,
    })
    this.wakeUp(partner)
    if (partner.side !== actor.side) {
      this.damageDealt[actor.side] += result.hpLost + result.shieldAbsorbed
      if (!partner.alive) this.action.killed.push(partner)
    }
  }

  /** Dano acorda quem está Adormecido (D146). */
  private wakeUp(unit: EngineUnit) {
    if (unit.alive && unit.conditions.wake()) {
      this.log.push({ type: 'WOKE', ref: unit.ref })
    }
  }

  /** Contágio (D146): quem está em volta e ainda não tem Dano contínuo pega, sem passar adiante. */
  private spreadContagion(source: EngineUnit) {
    const grid = this.grids[source.side]
    const position = grid.positionOf(source.ref)
    for (const ally of this.units.values()) {
      if (
        ally.side !== source.side ||
        !ally.alive ||
        ally.ref === source.ref ||
        ally.conditions.has(StatusType.DOT) ||
        !isAdjacent(position, grid.positionOf(ally.ref))
      ) {
        continue
      }
      this.log.push({
        type: 'STATUS',
        targetRef: ally.ref,
        status: StatusType.DOT,
        result: ally.conditions.applyStatus(
          StatusType.DOT,
          STATUS_RULES.CONTAGION.spreadDuration,
          STATUS_RULES.DOT.maxHpPercentPerTurn
        ),
      })
    }
  }

  /** Marca do Tático (D126): skill dele em aliado dá Coordenação (+10% de Ataque até o aliado agir). */
  private coordinates(actor: EngineUnit, skill: SnapshotSkill): boolean {
    return (
      actor.unitClass === CharacterClass.TACTICIAN &&
      skill.target === SkillTarget.ALLY
    )
  }

  /**
   * Linha do tempo (D126): de quem são as próximas `count` vezes (as ações cedidas pelo Comando primeiro). Não muda
   * nada e não usa a seed; empate exato pode sair trocado.
   */
  timeline(
    count = TIMELINE_LENGTH
  ): { ref: string; round: number; extra: boolean }[] {
    const extras = this.granted
      .filter((ref) => this.get(ref).alive)
      .map((ref) => ({ ref, round: this.queue.currentRound, extra: true }))

    return [
      ...extras,
      ...this.queue
        .project(Math.max(0, count - extras.length))
        .map((t) => ({ ref: t.ref, round: t.round, extra: false })),
    ].slice(0, count)
  }

  /** Mover/trocar custa meio turno (D123): devolve metade da barra que a ação gastou. */
  private halfTurnBack(unit: EngineUnit) {
    this.queue.shift(unit.ref, MOVE_TURN_COST_PERCENT)
    this.log.push({
      type: 'TURN_SHIFT',
      targetRef: unit.ref,
      percent: MOVE_TURN_COST_PERCENT,
    })
  }

  /** Alguma skill pronta tem alvo válido agora (D38: sem isso, Defender é a única ação). */
  private hasPossibleSkill(actor: EngineUnit): boolean {
    const fieldKey = this.fieldCatalog[0]?.key
    const cells = [0, 1, 2].flatMap((row) =>
      [0, 1, 2].map((column) => ({ row, column }))
    )

    const ready = new Set(actor.cooldowns.ready().map((s) => s.key))

    return actor.snapshot.skills
      .filter((s) => ready.has(s.key))
      .some((skill) => {
        const targetSide =
          skill.target === SkillTarget.ENEMY ? other(actor.side) : actor.side
        return cells.some((cell) => {
          const resolved = this.resolveSkill(actor, {
            type: 'SKILL',
            skillKey: skill.key,
            targetSide,
            target: cell,
            fieldKey,
          })
          return (
            resolved.isRight() &&
            (isSummon(resolved.value.skill) ||
              resolved.value.hits.some((h) => this.get(h.ref).alive))
          )
        })
      })
  }

  /** Valida a skill e resolve os alvos (sem mudar nada). Usado pela ação e pela prévia da IA. */
  private resolveSkill(
    actor: EngineUnit,
    payload: Extract<BattleActionPayload, { type: 'SKILL' }>
  ): Either<InvalidActionError, { skill: SnapshotSkill; hits: TargetHit[] }> {
    const skill = actor.snapshot.skills.find((s) => s.key === payload.skillKey)
    if (!skill) return left(new InvalidActionError('skill fora da build'))
    if (
      actor.conditions.has(StatusType.SILENCE) &&
      skill.tier !== SkillTier.BASIC
    ) {
      return left(
        new InvalidActionError('Silenciado: só a skill básica (D146)')
      )
    }
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

    const summon = summonEffect(skill)
    if (summon) {
      const error = this.summonError(actor, summon.beastRef, payload.target)
      return error ? left(error) : right({ skill, hits: [] })
    }

    const grid = this.grids[targetSide]
    const targets = resolveTargets({
      skill,
      actor: {
        ref: actor.ref,
        ...this.grids[actor.side].positionOf(actor.ref),
      },
      units: grid.units(),
      cell: payload.target,
      ...this.targetingFlags(targetSide),
    })
    if (targets.isLeft())
      return left(new InvalidActionError(targets.value.message))

    const taunt = this.tauntError(actor, skill, targetSide, targets.value)
    if (taunt) return left(taunt)

    if (skill.effects.some((e) => e.type === 'GRANT_TURN')) {
      const ally = targets.value[0] ? this.get(targets.value[0].ref) : null
      if (!ally || ally.ref === actor.ref || ally.conditions.cannotAct) {
        return left(
          new InvalidActionError(
            'Comando só em outro aliado que possa agir (D126)'
          )
        )
      }
    }

    if (skill.effects.some((e) => e.type === 'PROTECT')) {
      const ward = targets.value[0] ? this.get(targets.value[0].ref) : null
      if (
        !ward ||
        ward.ref === actor.ref ||
        !isAdjacent(
          this.grids[actor.side].positionOf(actor.ref),
          this.grids[actor.side].positionOf(ward.ref)
        )
      ) {
        return left(
          new InvalidActionError('Proteger só um aliado adjacente (D124)')
        )
      }
    }

    return right({ skill, hits: targets.value })
  }

  private useSkill(
    actor: EngineUnit,
    payload: Extract<BattleActionPayload, { type: 'SKILL' }>
  ): Either<InvalidActionError, void> {
    const resolved = this.resolveSkill(actor, payload)
    if (resolved.isLeft()) return left(resolved.value)
    const { skill } = resolved.value

    const summon = summonEffect(skill)
    if (summon) {
      this.log.push({
        type: 'SKILL',
        ref: actor.ref,
        skillKey: skill.key,
        potency: 1,
      })
      this.summon(actor, this.get(summon.beastRef), payload.target)
      actor.cooldowns.use(skill.key)
      return right(undefined)
    }

    const potency = actor.desgaste.potencyFor(skill, actor.hp)
    this.log.push({
      type: 'SKILL',
      ref: actor.ref,
      skillKey: skill.key,
      potency,
    })

    this.redirectedTo = null
    const hits = this.applyIntercept(skill, resolved.value.hits, payload.target)
    let producedEffect = false
    this.action = { damaged: [], killed: [], healed: false }

    for (const hit of hits) {
      const target = this.get(hit.ref)
      if (!target.alive) continue

      if (skill.baseHitChance !== null) {
        const chance = this.landChance(actor, target, skill.baseHitChance)
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

    if (producedEffect && this.coordinates(actor, skill)) {
      for (const hit of hits) {
        const ally = this.get(hit.ref)
        if (!ally.alive || ally === actor) continue
        ally.conditions.addModifier({
          source: 'COORDINATION',
          stat: Stat.ATTACK,
          percent: CLASS_MARKS.coordinationAttackPercent,
          turnsLeft: 1,
          unlimited: true,
          untilAction: true,
        })
        this.log.push({
          type: 'MODIFIER',
          ref: actor.ref,
          targetRef: ally.ref,
          stat: Stat.ATTACK,
          percent: CLASS_MARKS.coordinationAttackPercent,
          result: 'ADDED',
        })
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

    this.counterAttack(actor)

    // recarga vale mesmo errando (errar já custou turno e recarga, 9.4b)
    actor.cooldowns.use(skill.key)

    return right(undefined)
  }

  /** Interceptar do Guardião (D102): desvia um golpe de alvo único para o Guardião adjacente. */
  private applyIntercept(
    skill: SnapshotSkill,
    hits: TargetHit[],
    cell: GridPosition,
    dryRun = false
  ): TargetHit[] {
    if (skill.target !== SkillTarget.ENEMY || hits.length !== 1) return hits

    const target = this.get(hits[0].ref)
    if (!this.canBeProtected(target)) return hits

    // Proteger (D124): qualquer alcance de alvo único, antes do Interceptar
    const protector = target.protectedBy ? this.get(target.protectedBy) : null
    if (protector?.alive && protector.ref !== target.ref) {
      if (!dryRun) {
        this.log.push({
          type: 'PROTECTED',
          protectorRef: protector.ref,
          protectedRef: target.ref,
        })
        this.redirectedTo = protector.ref
      }
      return [{ ref: protector.ref, falloff: hits[0].falloff }]
    }
    const grid = this.grids[target.side]
    const guardians = this.guardianOrder[target.side]
      .map((ref) => this.get(ref))
      .filter((g) => g.alive && g.unitClass !== null)
      .map((g) => ({
        ref: g.ref,
        characterClass: g.unitClass!,
        ...grid.positionOf(g.ref),
        // Furtivo não se revela para interceptar (D146)
        canAct:
          !g.conditions.cannotAct &&
          !g.conditions.has(StatusType.STEALTH) &&
          g.conditions.canBeMoved,
      }))

    const guardianRef = this.intercepts[target.side].intercept(
      {
        targetRef: target.ref,
        targetCell: grid.positionOf(target.ref) ?? cell,
        range: skill.range,
        area: skill.area,
      },
      guardians,
      this.queue.currentRound,
      { dryRun }
    )
    if (!guardianRef) return hits

    if (!dryRun) {
      this.log.push({
        type: 'INTERCEPT',
        guardianRef,
        protectedRef: target.ref,
      })
    }

    return [{ ref: guardianRef, falloff: hits[0].falloff }]
  }

  private applyEffect(
    actor: EngineUnit,
    target: EngineUnit,
    skill: SnapshotSkill,
    effect: SnapshotEffect,
    potency: number,
    falloff: number,
    payload: Extract<BattleActionPayload, { type: 'SKILL' }>
  ) {
    if (!target.alive) return
    const round = this.current?.round ?? this.queue.currentRound

    switch (effect.type) {
      case 'DAMAGE': {
        const targetStatuses = target.conditions.active()
        const amount = target.invulnerable
          ? 0
          : this.damageOf(
              actor,
              target,
              skill,
              effect.power,
              potency,
              falloff,
              round
            )
        const result = applyDamage(
          this.absorbByEquality(target, amount),
          target,
          this.passiveIgnoresShield(actor)
        )
        // antes do dano: se o alvo morrer, o elo acaba junto, mas este golpe ainda passa
        const partner = this.linkedPartner(target)
        this.setHp(target, result.hpLeft, result.shieldLeft)
        this.log.push({
          type: 'DAMAGE',
          ref: actor.ref,
          targetRef: target.ref,
          amount: result.hpLost,
          shieldAbsorbed: result.shieldAbsorbed,
          hpLeft: result.hpLeft,
          ...(targetStatuses.length > 0 ? { targetStatuses } : {}),
        })
        if (result.hpLost + result.shieldAbsorbed > 0) this.wakeUp(target)
        if (target.side !== actor.side) {
          this.damageDealt[actor.side] += result.hpLost + result.shieldAbsorbed
          this.action.damaged.push(target)
          if (!target.alive) this.action.killed.push(target)
          else {
            this.firePassive(target, 'ON_HIT', { attacker: actor })
            if (result.hpLost + result.shieldAbsorbed > 0) {
              this.gearDotOnHit(actor, target)
            }
          }
        }
        if (partner) {
          this.shareLinkedDamage(
            actor,
            partner,
            result.hpLost + result.shieldAbsorbed
          )
        }
        this.checkEqualityBreak(target)
        return
      }

      case 'HEAL': {
        const amount = this.restoreOf(
          target,
          skill,
          effect.power,
          potency,
          round,
          'HEAL'
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
          round,
          'SHIELD'
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
        // o aprimoramento rende +15% também no buff e no debuff (D100)
        const percent =
          effectivePower(effect.percent, skill.isEnhanced) * potency
        const result = target.conditions.addModifier({
          source: skill.key,
          stat: effect.stat,
          percent,
          turnsLeft: effect.duration,
        })
        this.log.push({
          type: 'MODIFIER',
          ref: actor.ref,
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
          const chance = this.statusLandChance(actor, target, effect.baseChance)
          if (!roll(this.rng, chance)) {
            this.log.push({
              type: 'STATUS',
              ref: actor.ref,
              targetRef: target.ref,
              status: effect.status,
              result: 'RESISTED',
            })
            return
          }
        }

        if (effect.status === StatusType.LOCK) {
          const skillKey = target.cooldowns.lock()
          this.log.push({
            type: 'LOCK',
            ref: actor.ref,
            targetRef: target.ref,
            skillKey,
          })
          return
        }

        if (effect.status === StatusType.LINK) {
          if (this.applyLink(target, effect.duration, actor.ref) === 'IMMUNE') {
            this.log.push({
              type: 'STATUS',
              ref: actor.ref,
              targetRef: target.ref,
              status: effect.status,
              result: 'IMMUNE',
            })
          }
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
        if (effect.status === StatusType.TAUNT && result !== 'IMMUNE') {
          target.tauntedBy = actor.ref
        }
        this.log.push({
          type: 'STATUS',
          ref: actor.ref,
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
          ref: actor.ref,
          targetRef: target.ref,
          percent: effect.percent,
        })
        return
      }

      case 'CLEANSE': {
        const status = target.conditions.worstNegative
        if (status === StatusType.LINK) this.clearLink(target)
        else if (status) target.conditions.remove(status)
        this.log.push({
          type: 'CLEANSE',
          ref: actor.ref,
          targetRef: target.ref,
          status,
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

      case 'EXPLOIT':
        // o dano já veio multiplicado (exploitMultiplier); aqui só consome
        if (target.conditions.has(effect.status)) {
          if (effect.consume) target.conditions.remove(effect.status)
          this.log.push({
            type: 'EXPLOIT',
            targetRef: target.ref,
            status: effect.status,
            consumed: effect.consume,
          })
        }
        return

      case 'GRANT_TURN':
        this.granted.push(target.ref)
        if (effect.attackPercent) {
          target.conditions.addModifier({
            source: 'COMMAND',
            stat: Stat.ATTACK,
            percent: effect.attackPercent,
            turnsLeft: 1,
            unlimited: true,
            untilAction: true,
          })
        }
        this.log.push({
          type: 'GRANT_TURN',
          ref: actor.ref,
          targetRef: target.ref,
        })
        return

      case 'PROTECT':
        target.protectedBy = actor.ref
        // até o próximo turno do protetor (D127)
        actor.conditions.addModifier({
          source: 'PROTECTING',
          stat: Stat.DEFENSE,
          percent: PROTECT_DEFENSE_PERCENT,
          turnsLeft: 1,
          unlimited: true,
        })
        this.log.push({
          type: 'PROTECT',
          ref: actor.ref,
          targetRef: target.ref,
        })
        return

      case 'WEAKEN': {
        // Rei (D93): uma chance por alvo pela fórmula de status; pegou, −% em todos os stats (1 fonte por stat)
        if (target.side !== actor.side) {
          const chance = this.statusLandChance(actor, target, effect.baseChance)
          if (!roll(this.rng, chance)) {
            for (const stat of Object.values(Stat)) {
              this.log.push({
                type: 'MODIFIER',
                ref: actor.ref,
                targetRef: target.ref,
                stat,
                percent: effect.percent,
                result: 'RESISTED',
              })
            }
            return
          }
        }
        for (const stat of Object.values(Stat)) {
          const result = target.conditions.addModifier({
            source: skill.key,
            stat,
            percent: effect.percent,
            turnsLeft: effect.duration,
          })
          this.log.push({
            type: 'MODIFIER',
            ref: actor.ref,
            targetRef: target.ref,
            stat,
            percent: effect.percent,
            result,
          })
        }
        this.refreshSpeeds()
        return
      }

      case 'FORESIGHT': {
        // Vidente (D93): a chance vem do DOM da Mente do alvo; o Atordoado segue a imunidade anti-cadeia (D152)
        const mind = target.snapshot.dom?.pillars.MIND ?? 'NONE'
        if (!roll(this.rng, effect.chanceByMind[mind])) {
          this.log.push({
            type: 'STATUS',
            ref: actor.ref,
            targetRef: target.ref,
            status: StatusType.STUN,
            result: 'RESISTED',
          })
          return
        }
        const result = target.conditions.applyStatus(
          StatusType.STUN,
          effect.duration
        )
        this.log.push({
          type: 'STATUS',
          ref: actor.ref,
          targetRef: target.ref,
          status: StatusType.STUN,
          result,
        })
        if (result !== 'IMMUNE') {
          this.firePassive(target, 'ON_STATUS', {
            attacker: actor,
            status: StatusType.STUN,
          })
        }
        return
      }

      case 'INVULNERABLE':
        target.invulnerable = true
        this.log.push({
          type: 'INVULNERABLE',
          ref: actor.ref,
          targetRef: target.ref,
        })
        return

      case 'EQUALITY':
        this.startEquality(target, skill.key, effect)
        return

      case 'SUMMON':
        // resolvido antes, em useSkill (a besta entra numa célula vazia, sem alvo)
        return

      case 'RECOVER': {
        // alivia 50% de todo o Desgaste, inclusive o HP máximo perdido pela Fundamental (9.4b, D59, D120)
        const before = target.desgaste.totalFraction()
        target.desgaste.relieve(RELIEF.RECOVERY_SKILL, { includeMaxHp: true })
        this.log.push({
          type: 'RECOVER',
          ref: actor.ref,
          targetRef: target.ref,
          relieved: before - target.desgaste.totalFraction(),
        })
        this.refreshSpeeds()
        return
      }
    }
  }

  /**
   * Quanto o adiantar/atrasar move de fato a barra do alvo, em %: a barra fica entre 0 e 1000 (D102), então adiantar
   * quem já está perto da vez desperdiça o resto; o atraso respeita a imunidade até agir.
   */
  private effectiveShift(target: EngineUnit, percent: number): number {
    if (percent < 0 && target.delayImmune) return 0
    const gauge = (this.queue.gaugeOf(target.ref) / ACTION_BAR_MAX) * 100

    return percent > 0
      ? Math.min(percent, Math.max(0, 100 - gauge))
      : Math.max(percent, -gauge)
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
    // Vetorial (equipamento vivo, D94): ignora parte da Defesa do alvo
    const ignoredDefense = gearPassive(actor, 'IGNORE_DEFENSE')?.percent ?? 0
    const raw =
      baseDamage(
        power,
        this.stat(actor, Stat.ATTACK),
        this.stat(target, Stat.DEFENSE) * (1 - ignoredDefense / 100),
        this.damageScale
      ) *
      falloff *
      damageMultiplier(round, this.exhaustionAfter) *
      target.conditions.damageTakenMultiplier *
      traitDamageMultiplier(actor, skill.range) *
      this.coverMultiplier(skill, target) *
      this.exploitMultiplier(skill, target) *
      this.artilleryMultiplier(actor) *
      (1 - this.damageReduction(target, skill.area === SkillArea.SINGLE) / 100)

    return finalDamage(raw)
  }

  /** Cobertura (D123): à distância, alvo único, em quem tem alguém na frente da linha e não está Exposto nem Preso (D145). */
  private coverMultiplier(skill: SnapshotSkill, target: EngineUnit): number {
    if (
      skill.target !== SkillTarget.ENEMY ||
      skill.range !== SkillRange.RANGED ||
      skill.area !== SkillArea.SINGLE ||
      target.conditions.isExposed ||
      target.conditions.has(StatusType.ROOT) ||
      !target.alive
    ) {
      return 1
    }
    const units = this.grids[target.side].units()
    const front = exposedOfRow(
      units,
      this.grids[target.side].positionOf(target.ref).row
    )

    return front && front.ref !== target.ref ? COVER_DAMAGE_MULTIPLIER : 1
  }

  /** Executar (D125): o dano cresce em alvo com o status que a skill aproveita. */
  private exploitMultiplier(skill: SnapshotSkill, target: EngineUnit): number {
    return skill.effects.reduce(
      (total, e) =>
        e.type === 'EXPLOIT' && target.conditions.has(e.status)
          ? total * e.multiplier
          : total,
      1
    )
  }

  /** Quanto uma cura ou escudo renderia no alvo; a cura rende metade em quem tem Ferida (D125). */
  private restoreOf(
    target: EngineUnit,
    skill: SnapshotSkill,
    effectPower: number,
    potency: number,
    round: number,
    kind: 'HEAL' | 'SHIELD'
  ): number {
    const power = effectivePower(effectPower, skill.isEnhanced) * potency
    const wound =
      kind === 'HEAL'
        ? this.woundMultiplier(target) * this.supportHealMultiplier(target)
        : 1

    if (kind === 'HEAL' && this.noHealing) return 0

    return Math.round(
      healAmount(power, target.desgaste.maxHp, this.healShare) *
        healMultiplier(round, this.exhaustionAfter) *
        wound
    )
  }

  /** Ferida (D125): Dano contínuo corta a cura recebida pela metade. */
  private woundMultiplier(unit: EngineUnit): number {
    return unit.conditions.has(StatusType.DOT) ? WOUND_HEAL_MULTIPLIER : 1
  }

  /** Acerto da skill; contra Atordoado é certo (indefeso, D125). */
  private landChance(actor: EngineUnit, target: EngineUnit, base: number) {
    if (target.conditions.has(StatusType.STUN)) return 1

    return hitChance(
      base,
      this.stat(actor, Stat.PRECISION),
      this.stat(target, Stat.EVASION) * target.conditions.evasionMultiplier
    )
  }

  /** Chance de status; nos do Controlador, a Vontade do alvo conta 30% menos (D125). */
  private statusLandChance(
    actor: EngineUnit,
    target: EngineUnit,
    base: number
  ) {
    const factor =
      actor.unitClass === CharacterClass.CONTROLLER
        ? CLASS_MARKS.controllerWillFactor
        : 1

    // Psíquica (equipamento vivo, D94): mais Vontade contra status
    const gearWill =
      1 + (gearPassive(target, 'STATUS_WILL')?.percent ?? 0) / 100

    return statusChance(
      base,
      this.stat(actor, Stat.PRECISION),
      this.stat(target, Stat.WILL) * factor * gearWill
    )
  }

  /** Atordoado (indefeso) e Preso (isolado) não podem ser protegidos por aliados (D125). */
  private canBeProtected(unit: EngineUnit): boolean {
    return (
      !unit.conditions.has(StatusType.STUN) &&
      !unit.conditions.has(StatusType.ROOT)
    )
  }

  private reposition(
    actor: EngineUnit,
    target: EngineUnit,
    kind: Extract<SnapshotEffect, { type: 'REPOSITION' }>['kind'],
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

    // Vanguarda ao lado ancora (D128): o forçado é barrado, o resto da skill acontece
    if (this.anchoredByVanguard(target)) {
      this.log.push({
        type: 'MOVE_BLOCKED',
        ref: target.ref,
        reason: 'BLOCKED',
      })
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

  private endTurn(unit: EngineUnit, options: { tickCooldowns?: boolean } = {}) {
    if (options.tickCooldowns ?? true) unit.cooldowns.endTurn()
    this.tickBeastClock(unit)
    unit.conditions.afterAction()
    if (!unit.conditions.has(StatusType.TAUNT)) unit.tauntedBy = null
    unit.delayImmune = false
    unit.swapImmune = false
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
    // a besta não é um dos 4 (D11, D64): não conta na eliminação nem no fim forçado
    const units = [...this.units.values()].filter(
      (u) => u.side === side && !u.snapshot.beast
    )

    return {
      side,
      units: units.map((u) => ({
        hp: u.alive ? u.hp : 0,
        startingMaxHp: u.startingMaxHp,
      })),
      desgaste: units.reduce((sum, u) => sum + u.desgaste.totalFraction(), 0),
      damageDealt: this.damageDealt[side],
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
      this.fieldMultiplier(unit, stat) *
      this.formationMultiplier(unit, stat)
    )
  }

  // ---------------------------------------------------------------------------
  // Formação e engajamento (D128, D129)
  // ---------------------------------------------------------------------------

  /** Aliados vivos adjacentes (4 direções). */
  private adjacentAllies(unit: EngineUnit): EngineUnit[] {
    if (!unit.alive) return []
    const grid = this.grids[unit.side]
    // a vizinhança só muda quando alguém se move ou cai: guarda por versão da grade (desempenho da previsão)
    const cache = this.neighbourCache[unit.side]
    if (cache.version !== grid.version) {
      cache.version = grid.version
      cache.byRef.clear()
    }
    const cached = cache.byRef.get(unit.ref)
    if (cached) return cached

    const at = grid.positionOf(unit.ref)
    const neighbours = grid
      .units()
      .filter((u) => u.ref !== unit.ref && isAdjacent(at, u))
      .map((u) => this.get(u.ref))
    cache.byRef.set(unit.ref, neighbours)

    return neighbours
  }

  /** Auras dos aliados adjacentes (sem somar iguais) e o lobo solitário do Executor. */
  private formationMultiplier(unit: EngineUnit, stat: Stat): number {
    if (!unit.alive) return 1
    const neighbours = this.adjacentAllies(unit)
    let total = 1

    for (const characterClass of new Set(neighbours.map((n) => n.unitClass))) {
      const aura = characterClass ? FORMATION_STAT_AURA[characterClass] : null
      if (aura && aura.stat === stat) total *= 1 + aura.percent / 100
    }
    if (
      stat === Stat.ATTACK &&
      unit.unitClass === CharacterClass.EXECUTOR &&
      neighbours.length === 0
    ) {
      total *= 1 + EXECUTOR_LONE_ATTACK_PERCENT / 100
    }

    return total
  }

  /** Cura recebida com um Suporte ao lado (D128). */
  private supportHealMultiplier(unit: EngineUnit): number {
    return this.adjacentAllies(unit).some(
      (n) => n.unitClass === CharacterClass.SUPPORT
    )
      ? 1 + SUPPORT_HEAL_AURA_PERCENT / 100
      : 1
  }

  /** Vanguarda ao lado: não pode ser empurrado, puxado nem trocado à força (D128). */
  private anchoredByVanguard(unit: EngineUnit): boolean {
    return this.adjacentAllies(unit).some(
      (n) => n.unitClass === CharacterClass.VANGUARD
    )
  }

  /** Artilharia no fundo da linha (com alguém na frente dela): +10% de dano (D128). */
  private artilleryMultiplier(actor: EngineUnit): number {
    if (actor.unitClass !== CharacterClass.ARTILLERY) return 1
    const grid = this.grids[actor.side]
    const at = grid.positionOf(actor.ref)
    const row = grid.units().filter((u) => u.row === at.row)
    const atBack = row.every((u) => u.column <= at.column)

    return atBack && row.length > 1
      ? 1 + ARTILLERY_BACK_DAMAGE_PERCENT / 100
      : 1
  }

  /**
   * Engajado (D129): na frente da linha, com um Vanguarda, Guardião ou Executor na frente da linha oposta. Mover ou
   * trocar custa o turno inteiro.
   */
  private isEngaged(unit: EngineUnit): boolean {
    if (!unit.alive) return false
    const own = this.grids[unit.side]
    const row = own.positionOf(unit.ref).row
    if (exposedOfRow(own.units(), row)?.ref !== unit.ref) return false

    const facing = exposedOfRow(this.grids[other(unit.side)].units(), row)
    return (
      !!facing &&
      ENGAGING_CLASSES.includes(
        this.get(facing.ref).unitClass as CharacterClass
      )
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
    // a passiva "ao ser derrotado" dispara com o dono já caído (D124)
    if (this.inPassive || (!unit.alive && event !== 'ON_DEFEATED')) return

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
            (this.noHealing ? 0 : healMultiplier(round, this.exhaustionAfter)) *
            this.woundMultiplier(owner) *
            this.supportHealMultiplier(owner)
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

      case 'ADVANCE_ALLIES':
        for (const ally of this.units.values()) {
          if (ally.side !== owner.side || !ally.alive || ally === owner)
            continue
          this.queue.shift(ally.ref, effect.percent)
          this.log.push({
            type: 'TURN_SHIFT',
            ref: owner.ref,
            targetRef: ally.ref,
            percent: effect.percent,
          })
        }
        return

      case 'ADVANCE_TURN':
        this.queue.shift(owner.ref, effect.percent)
        this.log.push({
          type: 'TURN_SHIFT',
          ref: owner.ref,
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
            : this.statusLandChance(owner, target, effect.chance)
        if (!roll(this.rng, chance)) {
          this.log.push({
            type: 'STATUS',
            ref: owner.ref,
            targetRef: target.ref,
            status: effect.status,
            result: 'RESISTED',
          })
          return
        }

        if (effect.status === StatusType.LOCK) {
          this.log.push({
            type: 'LOCK',
            ref: owner.ref,
            targetRef: target.ref,
            skillKey: target.cooldowns.lock(),
          })
          return
        }

        if (effect.status === StatusType.LINK) {
          this.applyLink(target, STATUS_RULES.LINK.duration, owner.ref)
          return
        }

        const result = target.conditions.applyDefaultStatus(effect.status)
        if (effect.status === StatusType.TAUNT) target.tauntedBy = owner.ref
        this.log.push({
          type: 'STATUS',
          ref: owner.ref,
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

  // ---------------------------------------------------------------------------
  // Equipamento vivo (D94, D153, `living_gear_brief.md` 9)
  // ---------------------------------------------------------------------------

  /**
   * % de dano recebido a menos: a passiva do personagem e, em golpe de alvo único, a da Material. Efeitos iguais não
   * somam (vale o mais forte, `progression_brief.md` 2.11).
   */
  private damageReduction(unit: EngineUnit, singleTarget: boolean): number {
    const passive = this.passiveDamageReduction(unit)
    const gear = singleTarget
      ? (gearPassive(unit, 'SINGLE_TARGET_REDUCTION')?.percent ?? 0)
      : 0

    return Math.max(passive, gear)
  }

  /** Biológica: regenera um % do HP máximo no início do turno (cura, então a Exaustão e a Ferida valem). */
  private gearRegen(unit: EngineUnit) {
    const regen = gearPassive(unit, 'REGEN')
    if (!regen || !unit.alive) return

    const round = this.current?.round ?? this.queue.currentRound
    const amount = Math.round(
      ((unit.desgaste.maxHp * regen.percentOfMaxHp) / 100) *
        (this.noHealing ? 0 : healMultiplier(round, this.exhaustionAfter)) *
        this.woundMultiplier(unit)
    )
    const healed = Math.min(amount, unit.desgaste.maxHp - unit.hp)
    if (healed <= 0) return

    unit.hp += healed
    this.log.push({
      type: 'HEAL',
      ref: unit.ref,
      targetRef: unit.ref,
      amount: healed,
      source: 'GEAR',
    })
  }

  /**
   * Parcial e sem elo, do Mestre para cima: o equipamento age sozinho e o portador perde a ação. A chance começa no
   * `start`, sobe `step` a cada turno e para no `max` (zera na batalha seguinte).
   */
  private gearTakesAction(unit: EngineUnit): boolean {
    const lose = unit.snapshot.gear?.loseAction
    if (!lose) return false

    const chance = Math.min(
      lose.max,
      lose.start + lose.step * (unit.turnsStarted - 1)
    )

    return roll(this.rng, chance / 100)
  }

  /** Elemental: chance de aplicar Dano contínuo ao causar dano num inimigo (pela fórmula de status). */
  private gearDotOnHit(actor: EngineUnit, target: EngineUnit) {
    const dot = gearPassive(actor, 'DOT_ON_HIT')
    if (!dot || !target.alive || actor.side === target.side) return

    const landed = roll(
      this.rng,
      this.statusLandChance(actor, target, dot.chance)
    )
    this.log.push({
      type: 'STATUS',
      ref: actor.ref,
      targetRef: target.ref,
      status: StatusType.DOT,
      result: landed
        ? target.conditions.applyDefaultStatus(StatusType.DOT)
        : 'RESISTED',
      source: 'GEAR',
    })
  }

  // ---------------------------------------------------------------------------
  // Bestas (D64, D95, D154, `beast_contracts_brief.md`)
  // ---------------------------------------------------------------------------

  /** Bestas em campo agora no lado (o teto é 2; a Igualdade não conta). */
  private beastsOnField(side: BattleSide): number {
    return [...this.units.values()].filter(
      (u) => u.side === side && u.alive && u.snapshot.beast
    ).length
  }

  /** Por que a besta não pode entrar nesta célula agora; nulo = pode. */
  private summonError(
    actor: EngineUnit,
    beastRef: string,
    cell: GridPosition
  ): InvalidActionError | null {
    const beast = this.units.get(beastRef)
    if (!beast?.snapshot.beast || beast.snapshot.beast.ownerRef !== actor.ref) {
      return new InvalidActionError('besta fora do contrato desta unidade')
    }
    if (beast.alive) return new InvalidActionError('a besta já está em campo')
    if (this.beastsOnField(actor.side) >= BEAST_FIELD_CAP) {
      return new InvalidActionError(
        `no máximo ${BEAST_FIELD_CAP} bestas em campo por squad (D95)`
      )
    }
    if (!this.grids[actor.side].isEmpty(cell)) {
      return new InvalidActionError(
        'a besta entra numa célula livre do próprio lado'
      )
    }

    return null
  }

  /** A besta entra em campo: na célula, na fila (barra zerada) e com a duração dela. */
  private summon(owner: EngineUnit, beast: EngineUnit, cell: GridPosition) {
    const info = beast.snapshot.beast!
    beast.alive = true
    beast.hp = beast.desgaste.maxHp
    beast.shield = 0
    beast.beastTurnsLeft = info.duration
    this.grids[owner.side].place(beast.ref, cell)
    this.queue.add({
      ref: beast.ref,
      speed: this.speedOf(beast),
      statAverage: statAverage(beast.base),
    })
    this.log.push({
      type: 'SUMMON',
      ref: owner.ref,
      beastRef: beast.ref,
      to: { ...cell },
    })

    // Dominância (9.3): o dono perde Vontade enquanto ela está em campo, sem passar do piso de 80% do Desgaste
    if (info.ownerWillCost > 0 && owner.alive) {
      const base = owner.base[Stat.WILL]
      const room =
        base > 0
          ? ((owner.desgaste.stat(Stat.WILL) - base * DESGASTE_FLOOR) / base) *
            100
          : 0
      const percent = -Math.min(info.ownerWillCost, Math.max(0, room))
      if (percent < 0) {
        const result = owner.conditions.addModifier({
          source: beastSource(beast.ref),
          stat: Stat.WILL,
          percent,
          turnsLeft: BEAST_MODIFIER_TURNS,
          unlimited: true,
        })
        this.log.push({
          type: 'MODIFIER',
          ref: beast.ref,
          targetRef: owner.ref,
          stat: Stat.WILL,
          percent,
          result,
        })
      }
    }
    this.refreshSpeeds()
  }

  /** A besta sai: acabou a duração. */
  private dismissBeast(beast: EngineUnit) {
    beast.alive = false
    this.queue.remove(beast.ref)
    this.grids[beast.side].remove(beast.ref)
    this.clearLink(beast)
    this.log.push({ type: 'BEAST_LEAVE', ref: beast.ref })
    this.releaseOwner(beast)
  }

  /** O dono deixa de pagar o custo da besta que saiu ou caiu. */
  private releaseOwner(beast: EngineUnit) {
    const owner = this.units.get(beast.snapshot.beast!.ownerRef)
    owner?.conditions.removeModifiers(beastSource(beast.ref))
    this.refreshSpeeds()
  }

  /** Fim do turno: a besta conta os turnos dela; o dono conta os da Igualdade. */
  private tickBeastClock(unit: EngineUnit) {
    if (unit.snapshot.beast && unit.alive) {
      unit.beastTurnsLeft -= 1
      if (unit.beastTurnsLeft <= 0) this.dismissBeast(unit)
    }

    const equality = unit.equality
    if (!equality) return
    if (equality.fresh) {
      equality.fresh = false
      return
    }
    equality.turnsLeft -= 1
    if (equality.turnsLeft <= 0) {
      unit.conditions.removeModifiers(equality.source)
      unit.equality = null
      this.log.push({ type: 'BEAST_LEAVE', ref: unit.ref, equality: true })
    }
  }

  /** Igualdade (9.4): o buffer no dono e o bônus de Precisão e Esquiva, por N turnos dele. */
  private startEquality(
    owner: EngineUnit,
    source: string,
    effect: Extract<SnapshotEffect, { type: 'EQUALITY' }>
  ) {
    const buffer = Math.round(
      (owner.desgaste.maxHp * effect.bufferPercent) / 100
    )
    owner.equality = {
      source,
      buffer,
      turnsLeft: effect.duration,
      bonusPercent: effect.bonusPercent,
      absorbShare: effect.absorbShare,
      breakPercent: effect.breakPercent,
      fresh: true,
    }
    for (const stat of [Stat.PRECISION, Stat.EVASION]) {
      owner.conditions.addModifier({
        source,
        stat,
        percent: effect.bonusPercent,
        turnsLeft: BEAST_MODIFIER_TURNS,
        unlimited: true,
      })
    }
    this.log.push({ type: 'EQUALITY', ref: owner.ref, buffer })
  }

  /** A besta da Igualdade segura parte do golpe (até esvaziar o buffer); devolve o que sobra para o dono. */
  private absorbByEquality(target: EngineUnit, amount: number): number {
    const equality = target.equality
    if (!equality || amount <= 0) return amount

    const absorbed = Math.min(
      equality.buffer,
      Math.round(amount * equality.absorbShare)
    )
    equality.buffer -= absorbed
    if (absorbed > 0) {
      this.log.push({
        type: 'EQUALITY_ABSORB',
        ref: target.ref,
        amount: absorbed,
      })
    }

    return amount - absorbed
  }

  /** O buffer esvaziou: a dor da besta vira do dono (10% do HP máximo, sem Defesa) e os bônus acabam. */
  private checkEqualityBreak(owner: EngineUnit) {
    const equality = owner.equality
    if (!equality || equality.buffer > 0) return

    owner.equality = null
    owner.conditions.removeModifiers(equality.source)
    if (!owner.alive) return

    const amount = Math.round(
      (owner.desgaste.maxHp * equality.breakPercent) / 100
    )
    const result = applyDamage(owner.invulnerable ? 0 : amount, owner)
    this.setHp(owner, result.hpLeft, result.shieldLeft)
    this.log.push({
      type: 'EQUALITY_BREAK',
      ref: owner.ref,
      amount: result.hpLost + result.shieldAbsorbed,
    })
  }

  private setHp(unit: EngineUnit, hp: number, shield: number) {
    unit.hp = Math.max(0, hp)
    unit.shield = Math.max(0, shield)

    if (unit.hp === 0 && unit.alive) {
      unit.alive = false
      this.queue.remove(unit.ref)
      this.grids[unit.side].remove(unit.ref)
      this.log.push({ type: 'DEFEATED', ref: unit.ref })
      this.clearLink(unit)
      // besta caída (D64): o dono perde só o que ela dava; ninguém morre por isso
      if (unit.snapshot.beast) {
        this.releaseOwner(unit)
        return
      }
      this.firePassive(unit, 'ON_DEFEATED')
      for (const ally of this.units.values()) {
        if (ally.side === unit.side && ally.alive) {
          this.firePassive(ally, 'ON_ALLY_DEFEATED')
        }
      }
    }
  }

  /** Fundamental reduz o HP máximo: o atual é cortado para o novo máximo (9.4b). */
  private clampToMaxHp(unit: EngineUnit) {
    if (unit.hp > unit.desgaste.maxHp) unit.hp = unit.desgaste.maxHp
  }

  /** Velocidade na fila: a da unidade, ou a mesma para todos (`equalSpeed`, D155). */
  private speedOf(unit: EngineUnit): number {
    return this.equalSpeed ?? Math.max(1, this.stat(unit, Stat.SPEED))
  }

  private refreshSpeeds() {
    for (const unit of this.units.values()) {
      if (unit.alive) this.queue.setSpeed(unit.ref, this.speedOf(unit))
    }
  }

  private shuffledGuardians(side: BattleSide): string[] {
    const refs = [...this.units.values()]
      .filter((u) => u.side === side && u.unitClass === 'GUARDIAN')
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
  const gear = snapshot.gear
  // a besta vem com os stats prontos (% dos do dono, D95)
  const base = snapshot.stats
    ? { ...snapshot.stats }
    : computeStats({
        profile: snapshot.profile,
        level: snapshot.level,
        freePoints: snapshot.freePoints,
        traitEffects: snapshot.traitEffects,
        domPercents: snapshot.dom?.statPercents,
        gearPercents: gear ? gearBattlePercents(gear) : undefined,
      })
  const desgaste = new DesgasteState({
    baseStats: base,
    lineages: snapshot.lineages,
    hasAwakenedSkill: snapshot.skills.some((s) => s.isAwakened),
    lineageCostPercent: snapshot.lineageCostPercent,
  })

  // equipamento vivo (D94): o custo do elo pleno já entra como Desgaste, e a Fundamental começa com escudo
  let hp = base.HP
  if (gear && gear.initialDesgastePercent > 0) {
    hp -= desgaste.chargeFlat(gear.lineage, gear.initialDesgastePercent, hp)
    hp = Math.min(Math.round(hp), desgaste.maxHp)
  }
  const shield =
    gear?.passive.type === 'INITIAL_SHIELD'
      ? Math.round((desgaste.maxHp * gear.passive.percentOfMaxHp) / 100)
      : 0

  return {
    ref: snapshot.ref,
    side,
    snapshot,
    base,
    startingMaxHp: base.HP,
    hp,
    shield,
    alive: true,
    desgaste,
    conditions: new UnitConditions(),
    cooldowns: new SkillCooldowns(snapshot.skills),
    delayImmune: false,
    swapImmune: false,
    turnsStarted: 0,
    tauntedBy: null,
    protectedBy: null,
    linkedWith: null,
    invulnerable: false,
    unitClass: snapshot.beast ? null : snapshot.characterClass,
    beastTurnsLeft: 0,
    equality: null,
  }
}

/** Buffs e debuffs ligados a uma besta duram enquanto ela está lá (tira quem a besta sair ou cair). */
const BEAST_MODIFIER_TURNS = 999

const beastSource = (beastRef: string) => `BEAST:${beastRef}`

function summonEffect(
  skill: SnapshotSkill
): Extract<SnapshotEffect, { type: 'SUMMON' }> | null {
  const effect = skill.effects.find((e) => e.type === 'SUMMON')
  return (effect as Extract<SnapshotEffect, { type: 'SUMMON' }>) ?? null
}

function isSummon(skill: SnapshotSkill): boolean {
  return skill.effects.some((e) => e.type === 'SUMMON')
}

/** % do equipamento na batalha: o bônus (já com o elo) e a queda do parcial e do sem elo. */
function gearBattlePercents(gear: SnapshotGear): Partial<Record<Stat, number>> {
  const percents: Partial<Record<Stat, number>> = { ...gear.bonusPercents }
  for (const [stat, percent] of Object.entries(gear.penaltyPercents) as [
    Stat,
    number,
  ][]) {
    percents[stat] = (percents[stat] ?? 0) + percent
  }

  return percents
}

/** Valor da passiva do equipamento se ela for deste tipo (0 sem equipamento ou de outro tipo). */
function gearPassive<T extends GearPassive['type']>(
  unit: EngineUnit,
  type: T
): Extract<GearPassive, { type: T }> | null {
  const passive = unit.snapshot.gear?.passive
  return passive?.type === type
    ? (passive as Extract<GearPassive, { type: T }>)
    : null
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
